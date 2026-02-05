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

type SetChatTitleArgs = { title: string };

const setChatTitle = async ({ title }: SetChatTitleArgs): Promise<string> => {
  console.log(`[AI Proxy] Tool executed: set_chat_title with title: ${title}`);
  return JSON.stringify({ success: true, title });
};

const tools = [
  {
    name: "set_chat_title",
    description:
      "Sets a short, descriptive title for this conversation based on what the user is asking about. Call this BEFORE answering the user.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description:
            "A short, concise conversation title (max 40 characters) describing the user's request. Examples: 'Dog Blog Ideas', 'Homepage Edits', 'Translate Hero Section'",
        },
      },
      required: ["title"],
    },
  },
];

app.post("/v1/chat/completions", async (c) => {
  try {
    const body = await c.req.json<{
      model?: string;
      messages: any[];
      max_tokens?: number;
      temperature?: number;
      stream?: boolean;
      tools?: any[];
    }>();

    const {
      model = "@cf/meta/llama-4-scout-17b-16e-instruct",
      messages,
      max_tokens = 4096,
      temperature = 0.2,
      stream = false,
      tools,
    } = body;

    console.log(`[AI Proxy] Model: ${model}`);
    console.log(`[AI Proxy] Messages count: ${messages.length}`);
    console.log(`[AI Proxy] Tools provided: ${!!tools?.length}`);

    const convertedMessages = convertMessageContent(messages);

    const lastMessage = convertedMessages[convertedMessages.length - 1];
    console.log(`[AI Proxy] Last message role: ${lastMessage?.role}`);
    if (Array.isArray(lastMessage?.content)) {
      console.log(`[AI Proxy] Content items: ${lastMessage.content.length}`);
    }

    console.log(
      "[AI Proxy] All messages being sent:",
      JSON.stringify(convertedMessages, null, 2)
    );

    const hasTools = tools && tools.length > 0;
    console.log(`[AI Proxy] hasTools: ${hasTools}`);

    const modelToUse = hasTools
      ? "@hf/nousresearch/hermes-2-pro-mistral-7b"
      : model;

    // Hermes 2 Pro Mistral has a max token limit of 1024
    const maxTokensToUse =
      modelToUse === "@hf/nousresearch/hermes-2-pro-mistral-7b"
        ? Math.min(max_tokens, 1024)
        : max_tokens;

    console.log(
      `[AI Proxy] Using model: ${modelToUse} (tools present: ${hasTools}, max_tokens: ${maxTokensToUse})`
    );

    // Step 1: Initial AI call with tools
    const initialResponse = await c.env.AI.run(modelToUse, {
      messages: convertedMessages,
      tools: hasTools ? tools : undefined,
      max_tokens: maxTokensToUse,
      temperature,
    });

    console.log(
      "[AI Proxy] Initial response:",
      JSON.stringify(initialResponse, null, 2)
    );

    let assistantMessage = "";
    const toolCalls: any[] = [];
    let finalResponse = initialResponse;

    // Check for text-based tool calls (fallback for models that output tools as text)
    if (hasTools && initialResponse.response) {
      const textResponse = initialResponse.response;
      const textToolMatch = textResponse.match(/set_chat_title:\s*(\{[^}]+\})/);
      if (textToolMatch) {
        console.log("[AI Proxy] Found text-based tool call, parsing...");
        try {
          const toolArgs = JSON.parse(textToolMatch[1]);
          if (toolArgs.title) {
            // Create synthetic tool call
            const syntheticToolCall = {
              name: "set_chat_title",
              arguments: toolArgs,
              id: `call_${Date.now()}_text`,
            };
            initialResponse.tool_calls = [syntheticToolCall];
            // Remove the tool call text from the response
            initialResponse.response = textResponse
              .replace(textToolMatch[0], "")
              .trim();
            console.log(
              "[AI Proxy] Converted text tool call to proper format:",
              JSON.stringify(syntheticToolCall)
            );
          }
        } catch (e) {
          console.error("[AI Proxy] Failed to parse text-based tool call:", e);
        }
      }
    }

    // Check if model wants to call tools
    if (
      hasTools &&
      initialResponse.tool_calls &&
      initialResponse.tool_calls.length > 0
    ) {
      console.log(
        `[AI Proxy] Found ${initialResponse.tool_calls.length} tool calls!`
      );

      // Execute tools and collect results
      const toolResults: any[] = [];
      const validToolCalls = initialResponse.tool_calls.filter(
        (tc: any) => tc.name === "set_chat_title"
      );

      if (validToolCalls.length !== initialResponse.tool_calls.length) {
        console.log(
          `[AI Proxy] Filtered out ${initialResponse.tool_calls.length - validToolCalls.length} unknown tool calls`
        );
      }

      for (const tc of validToolCalls) {
        console.log(
          "[AI Proxy] Processing tool call:",
          JSON.stringify(tc, null, 2)
        );

        const toolCallId =
          tc.id ||
          `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Add to tool_calls array for response
        toolCalls.push({
          id: toolCallId,
          type: "function",
          function: {
            name: tc.name,
            arguments:
              typeof tc.arguments === "string"
                ? tc.arguments
                : JSON.stringify(tc.arguments),
          },
        });

        // Execute the tool
        const args =
          typeof tc.arguments === "string"
            ? JSON.parse(tc.arguments)
            : tc.arguments;

        // Validate the tool has the required 'title' parameter
        if (!args.title) {
          console.error(
            `[AI Proxy] ERROR: Tool called without 'title' parameter. Got: ${JSON.stringify(args)}`
          );
          // Generate a fallback title from the user's message
          const fallbackTitle = "New Conversation";
          console.log(`[AI Proxy] Using fallback title: ${fallbackTitle}`);
          args.title = fallbackTitle;
        }

        const toolResult = await setChatTitle(args);
        toolResults.push({
          tool_call_id: toolCallId,
          role: "tool",
          name: tc.name,
          content: toolResult,
        });
      }

      console.log(
        "[AI Proxy] Tool results:",
        JSON.stringify(toolResults, null, 2)
      );

      // Step 2: Follow-up call with tool results (only if we have actual results)
      if (toolResults.length > 0) {
        const messagesWithToolResults = [
          ...convertedMessages,
          {
            role: "assistant",
            content: "",
            tool_calls: initialResponse.tool_calls
              .filter((tc: any) => tc.name === "set_chat_title")
              .map((tc: any, index: number) => ({
                id: toolResults[index]?.tool_call_id || `call_${index}`,
                type: "function",
                function: {
                  name: tc.name,
                  arguments:
                    typeof tc.arguments === "string"
                      ? tc.arguments
                      : JSON.stringify(tc.arguments),
                },
              })),
          },
          ...toolResults.map((tr) => ({
            role: "tool" as const,
            tool_call_id: tr.tool_call_id,
            name: tr.name,
            content: tr.content,
          })),
        ];

        console.log(
          "[AI Proxy] Messages with tool results:",
          JSON.stringify(messagesWithToolResults, null, 2)
        );

        finalResponse = await c.env.AI.run(modelToUse, {
          messages: messagesWithToolResults,
          max_tokens: maxTokensToUse,
          temperature,
        });
      } else {
        console.log(
          "[AI Proxy] No valid tool results to process (AI called unknown tools). Re-calling without tools..."
        );
        // AI called unknown tools, re-call without tools to get actual response
        finalResponse = await c.env.AI.run(modelToUse, {
          messages: convertedMessages,
          max_tokens: maxTokensToUse,
          temperature,
        });
      }

      console.log(
        "[AI Proxy] Final response after tool execution:",
        JSON.stringify(finalResponse, null, 2)
      );
    } else {
      console.log("[AI Proxy] No tool calls detected in response");
    }

    // Extract assistant message
    if (finalResponse.response) {
      assistantMessage =
        typeof finalResponse.response === "string"
          ? finalResponse.response
          : JSON.stringify(finalResponse.response);
      console.log(
        "[AI Proxy] assistantMessage extracted:",
        assistantMessage.slice(0, 100)
      );
    }

    // Build OpenAI-compatible response
    const responseObj: any = {
      id: `chatcmpl_${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: modelToUse,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: assistantMessage,
          },
          finish_reason: toolCalls.length > 0 ? "tool_calls" : "stop",
        },
      ],
      usage: {
        prompt_tokens: finalResponse.usage?.prompt_tokens || 0,
        completion_tokens: finalResponse.usage?.completion_tokens || 0,
        total_tokens: finalResponse.usage?.total_tokens || 0,
      },
    };

    // Add tool_calls if present
    if (toolCalls.length > 0) {
      responseObj.choices[0].message.tool_calls = toolCalls;
      console.log("[AI Proxy] Added tool_calls to response");
    }

    console.log(
      "[AI Proxy] Final responseObj:",
      JSON.stringify(responseObj, null, 2)
    );

    return c.json(responseObj);
  } catch (error: any) {
    console.error("[AI Proxy] Error:", error);
    return c.json({ error: error.message, stack: error.stack }, 500);
  }
});

export default app;
