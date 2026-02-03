import { Hono } from "hono";
import { cors } from "hono/cors";

type Bindings = {
  ALLOWED_ORIGINS: string;
  AI: any;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS middleware
app.use("*", async (c, next) => {
  const allowedOrigins = (c.env.ALLOWED_ORIGINS || "").split(",");

  return cors({
    origin: (origin) => {
      return origin && allowedOrigins.includes(origin)
        ? origin
        : allowedOrigins[0];
    },
    allowMethods: ["POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "user-agent"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })(c, next);
});

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

/**
 * OpenAI chat completions endpoint
 * Supports both text and multimodal (vision) requests via Cloudflare Workers AI
 */
app.post("/v1/chat/completions", async (c) => {
  try {
    const body = await c.req.json<{
      model?: string;
      messages: any[];
      max_tokens?: number;
      temperature?: number;
      stream?: boolean;
    }>();

    const {
      model = "@cf/meta/llama-4-scout-17b-16e-instruct",
      messages,
      max_tokens = 4096,
      temperature = 0.2,
      stream = true,
    } = body;

    console.log(`[AI Proxy] Model: ${model}`);
    console.log(`[AI Proxy] Messages count: ${messages.length}`);
    console.log(`[AI Proxy] Stream: ${stream}`);

    // Convert messages to Cloudflare Workers AI format
    // Vercel AI SDK uses { type: "image", image: "data:..." }
    // Cloudflare expects { type: "image_url", image_url: { url: "data:..." } }
    const convertedMessages = messages.map((msg: any) => {
      if (Array.isArray(msg.content)) {
        return {
          ...msg,
          content: msg.content.map((item: any) => {
            if (item.type === "image" && item.image) {
              return {
                type: "image_url",
                image_url: {
                  url: item.image,
                },
              };
            }
            return item;
          }),
        };
      }
      return msg;
    });

    // Debug: Log the last message
    const lastMessage = convertedMessages[convertedMessages.length - 1];
    console.log(`[AI Proxy] Last message role: ${lastMessage?.role}`);
    if (Array.isArray(lastMessage?.content)) {
      console.log(`[AI Proxy] Content items: ${lastMessage.content.length}`);
      lastMessage.content.forEach((item: any, i: number) => {
        if (item.type === "image_url") {
          console.log(
            `[AI Proxy] Item ${i}: image_url with url length ${item.image_url?.url?.length || 0}`
          );
        } else {
          console.log(`[AI Proxy] Item ${i}: type=${item.type}`);
        }
      });
    }

    // Use native Cloudflare AI API directly
    const aiResponse = await c.env.AI.run(model, {
      messages: convertedMessages,
      stream,
      max_tokens,
      temperature,
    });

    if (!stream) {
      // Non-streaming response
      return c.json({
        id: `chatcmpl_${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: aiResponse.response || "" },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: aiResponse.usage?.prompt_tokens || 0,
          completion_tokens: aiResponse.usage?.completion_tokens || 0,
          total_tokens: aiResponse.usage?.total_tokens || 0,
        },
      });
    }

    // For streaming, return the raw stream from Cloudflare AI
    return new Response(aiResponse as ReadableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("[AI Proxy] Error:", error);
    return c.json({ error: error.message, stack: error.stack }, 500);
  }
});

export default app;
