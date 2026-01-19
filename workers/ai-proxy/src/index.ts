import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Ai } from '@cloudflare/ai';

type Bindings = {
  ALLOWED_ORIGINS: string;
  AI: any;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', async (c, next) => {
  const allowedOrigins = c.env.ALLOWED_ORIGINS.split(',');
  const origin = c.req.header('Origin');
  
  if (origin && allowedOrigins.includes(origin)) {
    return cors({
      origin: origin,
      allowMethods: ['POST', 'OPTIONS'],
      allowHeaders: ['Content-Type'],
      exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
      maxAge: 600,
      credentials: true,
    })(c, next);
  }
  
  return cors({
    origin: allowedOrigins[0],
    allowMethods: ['POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })(c, next);
});

app.post('/api/ai/stream', async (c) => {
  try {
    const body = await c.req.json();
    const messages = body.messages;
    const image = body.image; // Expecting number[] (byte array)
    
    // Determine if we should use the Vision model
    // 1. Explicit image data present
    // 2. Or text markup suggesting an image [Attachment: ...]
    // Note: If only text markup is present but no 'image' bytes, Llava will fail or just see text.
    // Llama 3 is safer for text-only markers.
    // BUT since we just updated the client to send 'image', we rely on that.
    
    const useVision = !!image || (Array.isArray(image) && image.length > 0);

    // Dynamic Model Selection
    const model = useVision
        ? "@cf/llava-hf/llava-1.5-7b-hf" // Vision Model
        : "@cf/meta/llama-3-8b-instruct"; // Text Model

    let args: any = { stream: true };


    // TODO: This needs works bruh
    if (useVision) {
        
        const prompt = messages.map((m: any) => {
            return `${m.role.toUpperCase()}: ${m.content}`;
        }).join('\n\n') + "\nASSISTANT:";

        args = {
            prompt: prompt,
            image: image, // Pass the byte array directly
            stream: true
        };
    } else {
        // Standard Llama 3 Chat
        args = {
            messages,
            stream: true
        };
    }

    // Native Binding Call
    const stream = await ai.run(model, args);

    return new Response(stream, {
        headers: { "content-type": "text/event-stream" }
    });

  } catch (error: any) {
    console.error("AI Error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
