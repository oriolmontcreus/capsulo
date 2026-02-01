import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createWorkersAI } from 'workers-ai-provider';
import { streamText, type CoreMessage, type ImagePart } from 'ai';
import { z } from 'zod';

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
 * AI Stream endpoint using Vercel AI SDK and Workers AI with Tool Calling
 */
app.post('/api/ai/stream', async (c) => {
  try {
    const body = await c.req.json<{
      messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
      images?: string[]
    }>();

    const { messages, images } = body;
    // Using Llama 3.2 11B Vision for multimodal support and tool calling
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

    console.log(`[AI Proxy] Running model: ${modelName} with Tool Calling`);

    const result = streamText({
      model: workersai(modelName),
      messages: coreMessages,
      maxTokens: 4096,
      temperature: 0.2,
      tools: {
        updateContent: {
          description: 'Update a component content in the CMS. Use this when the user asks to edit or change content.',
          parameters: z.object({
            componentId: z.string().describe('The ID of the component to update'),
            componentName: z.string().optional().describe('Human readable name of the component'),
            data: z.record(z.any()).describe('The new data for the component fields. Provide simple values (strings, numbers, booleans).')
          }),
        },
        setChatTitle: {
          description: 'Set a descriptive title for the conversation based on the user intent. Should be called only once per conversation, usually at the beginning.',
          parameters: z.object({
            title: z.string().max(40).describe('A short, highly descriptive title (max 40 chars)')
          }),
        },
      },
    });

    return result.toDataStreamResponse({
      headers: {
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
