import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  ALLOWED_ORIGINS: string;
  AI: Ai;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS middleware
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
    origin: allowedOrigins ?? ["*"],
    allowMethods: ['POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })(c, next);
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

/**
 * AI Stream endpoint using Llama 4 Scout (multimodal)
 */
app.post('/api/ai/stream', async (c) => {
  try {
    const body = await c.req.json();
    const messages = body.messages as Array<{ role: string; content: string }>;
    const imageBase64 = body.image as string | undefined; // Base64 string
    
    const model = "@cf/meta/llama-4-scout-17b-16e-instruct";
    
    // Build the messages array
    let formattedMessages: any[] = [];
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      // If it's the system message, we can enhance it to ensure the model knows it has vision
      if (msg.role === 'system') {
        formattedMessages.push({
          role: 'system',
          content: msg.content + "\n\nIMPORTANT: You are a multimodal AI. You CAN see and analyze images provided in the user's message. Never claim you are text-only."
        });
        continue;
      }

      // Check if this is the user message that should contain the image
      // Usually, it's the latest user message.
      const isLastUserMessage = msg.role === 'user' && i === messages.length - 1;
      
      if (isLastUserMessage && imageBase64) {
        // Construct multimodal content
        const imageUrl = imageBase64.startsWith('data:') 
          ? imageBase64 
          : `data:image/jpeg;base64,${imageBase64}`;

        formattedMessages.push({
          role: 'user',
          content: [
            { type: "text", text: msg.content },
            { 
              type: "image_url", 
              image_url: { url: imageUrl } 
            }
          ]
        });
      } else {
        // Regular text message
        formattedMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    console.log(`[AI Proxy] Running model: ${model}`);
    console.log(`[AI Proxy] Messages count: ${formattedMessages.length}`);
    console.log(`[AI Proxy] Has image: ${!!imageBase64}`);

    // Call Cloudflare AI
    const stream = await c.env.AI.run(model, {
      messages: formattedMessages,
      stream: true,
      max_tokens: 4096,
      temperature: 0.7,
    });

    return new Response(stream, {
      headers: { 
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });

  } catch (error: any) {
    console.error("[AI Proxy] Error:", error);
    
    // If Llama 4 Scout fails, maybe try Llama 3.2 as a fallback automatically
    try {
        console.log("[AI Proxy] Attempting fallback to Llama 3.2 Vision...");
        const body = await c.req.json(); //
    } catch(e) {}

    return c.json({ error: error.message }, 500);
  }
});

export default app;
