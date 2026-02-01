import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createWorkersAI } from 'workers-ai-provider';
import { streamText, type CoreMessage, type ImagePart } from 'ai';

type Bindings = {
  ALLOWED_ORIGINS: string;
  AI: any;
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
 * AI Stream endpoint using Vercel AI SDK and Workers AI
 */
app.post('/api/ai/stream', async (c) => {
  try {
    const body = await c.req.json<{
      messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
      images?: string[]
    }>();

    const { messages, images } = body;
    // Using Llama 3.2 11B Vision for multimodal support
    const modelName = "@cf/meta/llama-3.2-11b-vision-instruct";

    const workersai = createWorkersAI({ binding: c.env.AI });

    // Transform messages to AI SDK CoreMessage format
    const coreMessages: CoreMessage[] = messages.map((msg, index) => {
      const isLastUserMessage = msg.role === 'user' && index === messages.length - 1;

      if (isLastUserMessage && images && images.length > 0) {
        const content: Array<{ type: 'text'; text: string } | ImagePart> = [
          { type: 'text', text: msg.content }
        ];

        images.forEach(imageBase64 => {
          // Extract mime type if present in data URL
          let mimeType = 'image/jpeg';
          let base64Data = imageBase64;

          if (imageBase64.startsWith('data:')) {
            const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              mimeType = match[1];
              base64Data = match[2];
            }
          }

          content.push({
            type: 'image',
            image: base64Data,
            mimeType: mimeType
          });
        });

        return { role: 'user', content } as CoreMessage;
      }

      return { role: msg.role, content: msg.content } as CoreMessage;
    });

    console.log(`[AI Proxy] Running model: ${modelName} with AI SDK`);
    console.log(`[AI Proxy] Messages count: ${coreMessages.length}`);
    console.log(`[AI Proxy] Images count: ${images?.length || 0}`);

    const result = streamText({
      model: workersai(modelName),
      messages: coreMessages,
      maxTokens: 4096,
      temperature: 0.2,
    });

    return result.toTextStreamResponse({
      headers: {
        'Content-Type': 'text/x-unknown',
        'content-encoding': 'identity',
        'transfer-encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error("[AI Proxy] Error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
