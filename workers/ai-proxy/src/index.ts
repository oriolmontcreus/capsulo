import { Hono } from "hono";
import { cors } from "hono/cors";

type Bindings = {
  ALLOWED_ORIGINS: string;
  AI: any;
};

const app = new Hono<{ Bindings: Bindings }>();

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

app.get("/health", (c) => c.json({ status: "ok" }));

const convertMessageContent = (messages: any[]): any[] => {
  return messages.map((msg: any) => {
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
};

// Main chat endpoint - supports streaming
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
      stream = false,
    } = body;

    const convertedMessages = convertMessageContent(messages);

    console.log(
      `[AI Proxy] Chat: ${model}, stream=${stream}, msgs=${messages.length}`
    );

    if (stream) {
      // Streaming response - Cloudflare returns SSE stream directly
      const aiResponse = await c.env.AI.run(model, {
        messages: convertedMessages,
        max_tokens,
        temperature,
        stream: true,
      });

      // Transform Cloudflare SSE format to OpenAI-compatible format
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      // Process the stream
      (async () => {
        try {
          const reader = aiResponse.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let chunkCount = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Decode chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });
            chunkCount++;

            // Process complete lines from buffer
            const lines = buffer.split("\n");
            // Keep the last incomplete line in buffer
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  writer.write(encoder.encode("data: [DONE]\n\n"));
                } else {
                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.response || "";
                    const openaiChunk = {
                      id: `chatcmpl_${Date.now()}`,
                      object: "chat.completion.chunk",
                      created: Math.floor(Date.now() / 1000),
                      model,
                      choices: [
                        {
                          index: 0,
                          delta: { content },
                          finish_reason: null,
                        },
                      ],
                    };
                    writer.write(
                      encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`)
                    );
                  } catch (e) {
                    console.error("[AI Proxy] Parse error:", e);
                  }
                }
              }
            }
          }

          // Process any remaining data in buffer
          if (buffer.startsWith("data: ")) {
            const data = buffer.slice(6);
            if (data && data !== "[DONE]") {
              try {
                const parsed = JSON.parse(data);
                const content = parsed.response || "";
                const openaiChunk = {
                  id: `chatcmpl_${Date.now()}`,
                  object: "chat.completion.chunk",
                  created: Math.floor(Date.now() / 1000),
                  model,
                  choices: [
                    {
                      index: 0,
                      delta: { content },
                      finish_reason: null,
                    },
                  ],
                };
                writer.write(
                  encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`)
                );
              } catch (e) {
                // Ignore final parse errors
              }
            }
          }

          console.log(`[AI Proxy] Stream complete, ${chunkCount} chunks`);
          writer.close();
        } catch (error) {
          console.error("[AI Proxy] Stream error:", error);
          writer.abort(error);
        }
      })();

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming response
    const aiResponse = await c.env.AI.run(model, {
      messages: convertedMessages,
      max_tokens,
      temperature,
    });

    const content =
      typeof aiResponse.response === "string"
        ? aiResponse.response
        : JSON.stringify(aiResponse.response);

    console.log(`[AI Proxy] Response: ${content.slice(0, 60)}...`);

    return c.json({
      id: `chatcmpl_${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: aiResponse.usage?.prompt_tokens || 0,
        completion_tokens: aiResponse.usage?.completion_tokens || 0,
        total_tokens: aiResponse.usage?.total_tokens || 0,
      },
    });
  } catch (error: any) {
    console.error("[AI Proxy] Chat Error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Title generation endpoint - lightweight, no streaming
app.post("/v1/generate-title", async (c) => {
  try {
    const body = await c.req.json<{
      message: string;
      max_tokens?: number;
    }>();

    const { message, max_tokens = 256 } = body;

    console.log(
      `[AI Proxy] Title generation for: "${message.slice(0, 50)}..."`
    );

    const aiResponse = await c.env.AI.run(
      "@hf/nousresearch/hermes-2-pro-mistral-7b",
      {
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that generates short, descriptive titles for conversations. Generate a title that captures the essence of the user's message in 5 words or less. Return ONLY the title, no quotes or explanation.",
          },
          {
            role: "user",
            content: message,
          },
        ],
        max_tokens,
        temperature: 0.3,
      }
    );

    const title =
      typeof aiResponse.response === "string"
        ? aiResponse.response.trim().replace(/["']/g, "")
        : "New Chat";

    console.log(`[AI Proxy] Generated title: "${title}"`);

    return c.json({
      title,
      usage: {
        prompt_tokens: aiResponse.usage?.prompt_tokens || 0,
        completion_tokens: aiResponse.usage?.completion_tokens || 0,
        total_tokens: aiResponse.usage?.total_tokens || 0,
      },
    });
  } catch (error: any) {
    console.error("[AI Proxy] Title Error:", error);
    return c.json({ error: error.message, title: "New Chat" }, 500);
  }
});

export default app;
