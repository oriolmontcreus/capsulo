import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  ALLOWED_ORIGINS: string;
  AI: Ai;
};

type ContentPart = 
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

type FormattedMessage = {
  role: string;
  content: string | ContentPart[];
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS middleware
app.use('*', async (c, next) => {
  const allowedOrigins = (c.env.ALLOWED_ORIGINS || '').split(',');
  
  return cors({
    origin: (origin) => {
      // Allow if origin is in the list, otherwise default to the first allowed origin
      return (origin && allowedOrigins.includes(origin)) ? origin : allowedOrigins[0];
    },
    allowMethods: ['POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })(c, next);
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

/**
 * AI Stream endpoint using Llama 4 Scout (multimodal)
 */
app.post('/api/ai/stream', async (c) => {
  try {
    const body = await c.req.json<{ 
      messages: Array<{ role: string; content: string }>, 
      images?: string[] 
    }>();
    
    const { messages, images } = body;
    const model = "@cf/meta/llama-4-scout-17b-16e-instruct";
    
    // Transform messages
    const formattedMessages: FormattedMessage[] = messages.map((msg, index) => {
      const isLastUserMessage = msg.role === 'user' && index === messages.length - 1;

      if (isLastUserMessage && images && images.length > 0) {
        const content: ContentPart[] = [{ type: "text", text: msg.content }];
        
        images.forEach(imageBase64 => {
          const imageUrl = imageBase64.startsWith('data:') 
            ? imageBase64 
            : `data:image/jpeg;base64,${imageBase64}`;
            
          content.push({ 
            type: "image_url", 
            image_url: { url: imageUrl } 
          });
        });

        return { role: 'user', content };
      }

      return { role: msg.role, content: msg.content };
    });

    console.log(`[AI Proxy] Running model: ${model}`);
    console.log(`[AI Proxy] Messages count: ${formattedMessages.length}`);
    console.log(`[AI Proxy] Images count: ${images?.length || 0}`);

    // Call Cloudflare AI
    const stream = await c.env.AI.run(model, {
      messages: formattedMessages,
      stream: true,
      max_tokens: 4096,
      temperature: 0.2,
    });

    return new Response(stream as ReadableStream, {
      headers: { 
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });

  } catch (error: any) {
    console.error("[AI Proxy] Error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
