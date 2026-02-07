import { Hono } from "hono";
import { cors } from "hono/cors";
import { MODELS, CONFIG } from "./constants";
import { SYSTEM_PROMPTS, generateCmsActionsPrompt } from "../../../src/lib/ai/prompts";

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
      model = MODELS.CHAT,
      messages,
      max_tokens = CONFIG.DEFAULT_MAX_TOKENS,
      temperature = CONFIG.DEFAULT_TEMPERATURE,
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

    const { message, max_tokens = CONFIG.TITLE_MAX_TOKENS } = body;

    console.log(
      `[AI Proxy] Title generation for: "${message.slice(0, 50)}..."`
    );

    const aiResponse = await c.env.AI.run(
      MODELS.TITLE_GENERATION,
      {
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPTS.TITLE_GENERATION,
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

// Intent classification endpoint - determines if user wants to edit content or just ask a question
app.post("/v1/classify-intent", async (c) => {
  try {
    const body = await c.req.json<{
      message: string;
    }>();

    const { message } = body;

    console.log(
      `[AI Proxy] Classifying intent for: "${message.slice(0, 50)}..."`
    );

    const systemPrompt = `${SYSTEM_PROMPTS.INTENT_CLASSIFICATION}

User message: "${message}"`;

    const aiResponse = await c.env.AI.run(
      MODELS.INTENT_CLASSIFICATION,
      {
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: message,
          },
        ],
        max_tokens: CONFIG.INTENT_MAX_TOKENS,
        temperature: 0.1,
      }
    );

    const responseText =
      typeof aiResponse.response === "string"
        ? aiResponse.response.trim().toLowerCase()
        : "";

    // Parse the response - look for "edit" or "question"
    let intent: "edit" | "question" = "question";
    if (responseText.includes("edit")) {
      intent = "edit";
    }

    console.log(`[AI Proxy] Classified intent: "${intent}" (raw: "${responseText}")`);

    return c.json({
      intent,
      usage: {
        prompt_tokens: aiResponse.usage?.prompt_tokens || 0,
        completion_tokens: aiResponse.usage?.completion_tokens || 0,
        total_tokens: aiResponse.usage?.total_tokens || 0,
      },
    });
  } catch (error: any) {
    console.error("[AI Proxy] Intent Classification Error:", error);
    // Default to "question" on error to avoid unwanted edits
    return c.json({ intent: "question", error: error.message }, 500);
  }
});

// CMS Actions endpoint - analyzes conversation for content editing actions
app.post("/v1/cms-actions", async (c) => {
  try {
    const body = await c.req.json<{
      messages: any[];
      context: any;
      max_tokens?: number;
    }>();

    const { messages, context, max_tokens = CONFIG.ACTIONS_MAX_TOKENS } = body;

    console.log(`[AI Proxy] CMS Actions: ${messages.length} messages`);
    console.log(
      "[AI Proxy] CMS Actions context:",
      JSON.stringify(context).slice(0, 200)
    );

    // Extract just the component list from context for the prompt
    const components = context?.page?.data?.components || [];
    const componentList = components
      .map((c: any) => ({
        id: c.id,
        schemaName: c.schemaName,
        fields: Object.keys(c.data || {}),
      }))
      .slice(0, 10); // Limit to 10 components

    console.log(`[AI Proxy] Component list: ${JSON.stringify(componentList)}`);

    const systemPrompt = generateCmsActionsPrompt(componentList);

    console.log(`[AI Proxy] System prompt: ${systemPrompt.slice(0, 300)}...`);

    const aiResponse = await c.env.AI.run(
      MODELS.CMS_ACTIONS,
      {
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          ...messages,
        ],
        max_tokens,
        temperature: 0.1,
      }
    );

    let actions: any[] = [];
    const responseText =
      typeof aiResponse.response === "string" ? aiResponse.response.trim() : "";

    console.log(
      `[AI Proxy] CMS Actions raw response: ${responseText.slice(0, 200)}...`
    );

    // Try to parse the response as JSON
    try {
      let jsonText = responseText;

      // Extract from markdown block if present
      const markdownMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (markdownMatch) {
        jsonText = markdownMatch[1];
      }

      // Find first [ and last ]
      const firstBracket = jsonText.indexOf('[');
      const lastBracket = jsonText.lastIndexOf(']');

      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        jsonText = jsonText.substring(firstBracket, lastBracket + 1);

        // Try to fix common JSON errors
        // 1. Remove extra closing braces
        let openCount = 0;
        let closeCount = 0;
        for (const char of jsonText) {
          if (char === "{") openCount++;
          if (char === "}") closeCount++;
        }

        while (closeCount > openCount) {
          const lastClose = jsonText.lastIndexOf("}");
          if (lastClose > -1) {
            jsonText =
              jsonText.slice(0, lastClose) + jsonText.slice(lastClose + 1);
            closeCount--;
          } else {
            break;
          }
        }

        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed)) {
          actions = parsed;
        } else {
          // Should not happen if we parsed [...] but fallback
          actions = [parsed];
        }
      } else {
        console.warn("[AI Proxy] No JSON array found in response");
      }

    } catch (e) {
      console.error("[AI Proxy] Failed to parse actions:", e);
      console.error("[AI Proxy] Raw response:", responseText);
    }

    console.log(`[AI Proxy] Detected ${actions.length} CMS action(s)`);

    return c.json({
      actions,
      usage: {
        prompt_tokens: aiResponse.usage?.prompt_tokens || 0,
        completion_tokens: aiResponse.usage?.completion_tokens || 0,
        total_tokens: aiResponse.usage?.total_tokens || 0,
      },
    });
  } catch (error: any) {
    console.error("[AI Proxy] CMS Actions Error:", error);
    return c.json({ error: error.message, actions: [] }, 500);
  }
});

export default app;
