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

    const systemPrompt = `You are an intent classifier for a CMS (Content Management System). Your job is to determine if the user wants to EDIT website content or just ASK a question.

RESPOND WITH EXACTLY ONE WORD - either "edit" or "question":

"edit" - Use when the user wants to:
- Change, modify, update, or replace existing content
- Add new content or text to a component
- Remove or delete content
- Any action that modifies the website

"question" - Use when the user:
- Greets you (Hello, Hi, Hey, etc.)
- Asks about your identity (What's your name?, Who are you?, Who made you?)
- Asks about capabilities (What can you do?, How does this work?)
- Asks informational questions about the website
- Thanks you or gives feedback
- Makes small talk
- Asks ANY question that doesn't require content changes

EXAMPLES:
"Change the title to Welcome" → edit
"Update the hero subtitle" → edit
"Add 'test test' to the description" → edit
"Remove the call to action button" → edit
"What is your name?" → question
"Whats your name?" → question
"Hello!" → question
"Hi there" → question
"Who are you?" → question
"What can you do?" → question
"How does this CMS work?" → question
"Thanks!" → question
"Tell me about the hero component" → question
"What's in the header?" → question

IMPORTANT: When in doubt, respond with "question". Only respond "edit" when you are 100% certain the user wants to modify content.

User message: "${message}"`;

    const aiResponse = await c.env.AI.run(
      "@cf/meta/llama-3.1-8b-instruct",
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
        max_tokens: 10,
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

    const { messages, context, max_tokens = 1024 } = body;

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

    const systemPrompt = `You are a JSON generator. Your ONLY job is to output valid JSON arrays for content editing actions.

⚠️ CRITICAL: ONLY output actions for EXPLICIT content edit requests.

DO NOT OUTPUT ACTIONS FOR (return empty array []):
- Greetings: "Hello", "Hi", "Hey", "Good morning"
- Identity questions: "What is your name?", "Who are you?", "Who made you?"
- Capability questions: "What can you do?", "How does this work?"
- General questions about the website or content
- Thanks or feedback: "Thanks!", "Great job!"
- Small talk or conversation
- Questions asking ABOUT content (not changing it)
- ANY message that is NOT a direct request to change content

ONLY OUTPUT ACTIONS FOR (explicit edit requests):
- "Change the title to X" → Action to update title
- "Update the subtitle to Y" → Action to update subtitle
- "Add Z to the description" → Action to update description
- "Remove the button text" → Action to clear field
- "Replace the hero heading with W" → Action to update heading

JSON FORMAT RULES:
1. Output ONLY a JSON array - no text, no explanation, no markdown
2. Start with [ and end with ]
3. Each action object needs exactly these fields:
   - "action": "update"
   - "componentId": string (from available components)
   - "componentName": string  
   - "data": object with field updates

AVAILABLE COMPONENTS:
${componentList.map((c: any) => `- ${c.schemaName} (id: ${c.id}, fields: ${c.fields.join(", ")})`).join("\n")}

EXAMPLES OF WHAT TO RETURN:

User: "Change hero title to Welcome"
Output: [{"action":"update","componentId":"hero-0","componentName":"Hero","data":{"title":{"type":"input","value":{"en":"Welcome"},"translatable":true}}}]

User: "Update the subtitle to Hello World"
Output: [{"action":"update","componentId":"hero-0","componentName":"Hero","data":{"subtitle":{"type":"input","value":{"en":"Hello World"},"translatable":true}}}]

User: "What is your name?"
Output: []

User: "Whats your name?"
Output: []

User: "Hello!"
Output: []

User: "Who are you?"
Output: []

User: "What can you do?"
Output: []

User: "Thanks!"
Output: []

User: "Tell me about the hero"
Output: []

User: "What's in the title?"
Output: []

User: "How does this work?"
Output: []

IMPORTANT: When in doubt, output an empty array []. Only output actions when you are 100% CERTAIN the user explicitly wants to modify content.`;

    console.log(`[AI Proxy] System prompt: ${systemPrompt.slice(0, 300)}...`);

    const aiResponse = await c.env.AI.run(
      "@hf/nousresearch/hermes-2-pro-mistral-7b",
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
      // Extract JSON from potential markdown code blocks
      let jsonText = responseText;
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }

      // Try to find JSON array in the text
      const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        jsonText = arrayMatch[0];
      }

      // Fix common JSON errors - remove extra closing braces
      // Count opening and closing braces
      let openCount = 0;
      let closeCount = 0;
      for (const char of jsonText) {
        if (char === "{") openCount++;
        if (char === "}") closeCount++;
      }

      // Remove extra closing braces
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
      } else if (parsed && typeof parsed === "object") {
        // Single action object, wrap in array
        actions = [parsed];
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
