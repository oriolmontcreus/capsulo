/**
 * AI Service for Capsulo CMS.
 * Routes requests to appropriate providers using Vercel AI SDK:
 * - Groq (Llama 3.3): Primary provider for text-only requests (fast inference)
 * - Cloudflare Workers AI (Llama 4 Scout): For requests with image attachments (vision) and text fallback
 */

import { createGroq } from "@ai-sdk/groq";
import { streamText } from "ai";
import { generateCMSSystemPrompt } from "./prompts";
import type { Attachment, MessageRole } from "./types";

interface StreamOptions {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
  onTitle?: (title: string) => void;
}

interface AIRequest {
  message: string;
  context: any;
  history: { role: MessageRole; content: string }[];
  isFirstMessage?: boolean;
  attachments?: Attachment[];
}

export class AIService {
  private getGroqKey(): string | null {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem("capsulo-ai-groq-key");
    } catch (error) {
      console.error("Failed to access API key from storage:", error);
      return null;
    }
  }

  private getCloudflareWorkerUrl(): string | null {
    const url = import.meta.env.PUBLIC_AI_WORKER_URL;
    return url || null;
  }

  async generateStream(request: AIRequest, options: StreamOptions) {
    const hasAttachments =
      request.attachments && request.attachments.length > 0;

    if (hasAttachments) {
      const cloudflareUrl = this.getCloudflareWorkerUrl();

      if (!cloudflareUrl) {
        options.onError(
          new Error(
            "NO_CLOUDFLARE_URL: Please configure the Cloudflare Worker URL in settings to use image attachments."
          )
        );
        return;
      }

      try {
        console.log(
          "[AIService] Routing to Cloudflare Workers AI (Llama 4 Scout) - Vision request"
        );
        await this.streamCloudflare(cloudflareUrl, request, options);
      } catch (error: any) {
        console.error("[AIService] Cloudflare generation failed:", error);
        options.onError(error);
      }
    } else {
      const groqKey = this.getGroqKey();
      const cloudflareUrl = this.getCloudflareWorkerUrl();

      if (groqKey) {
        try {
          console.log("[AIService] Routing to Groq (Llama 3.3) - Text request");
          await this.streamGroq(groqKey, request, options);
        } catch (error: any) {
          console.error("[AIService] Groq generation failed:", error);
          options.onError(error);
        }
      } else if (cloudflareUrl) {
        try {
          console.log(
            "[AIService] Routing to Cloudflare Workers AI (no Groq key) - Text request"
          );
          await this.streamCloudflare(cloudflareUrl, request, options);
        } catch (error: any) {
          console.error("[AIService] Cloudflare generation failed:", error);
          options.onError(error);
        }
      } else {
        options.onError(
          new Error(
            "NO_KEYS: Please configure either the Groq API key or Cloudflare Worker URL in the Inspector settings."
          )
        );
      }
    }
  }

  private async streamCloudflare(
    workerUrl: string,
    request: AIRequest,
    options: StreamOptions
  ) {
    const hasAttachments =
      request.attachments && request.attachments.length > 0;

    console.log(`[AIService/Cloudflare] Has attachments: ${hasAttachments}`);
    if (hasAttachments) {
      console.log(
        `[AIService/Cloudflare] Attachment count: ${request.attachments!.length}`
      );
      request.attachments!.forEach((att, i) => {
        console.log(
          `[AIService/Cloudflare] Attachment ${i}: type=${att.type}, mimeType=${att.mimeType}, data length=${att.data?.length || 0}`
        );
      });
    }

    const messages: any[] = [
      {
        role: "system",
        content: generateCMSSystemPrompt(
          request.context,
          request.isFirstMessage,
          hasAttachments
        ),
      },
      ...request.history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    if (hasAttachments) {
      const contentParts: any[] = [{ type: "text", text: request.message }];

      for (const attachment of request.attachments!) {
        if (attachment.type === "image") {
          const imageDataUrl = `data:${attachment.mimeType};base64,${attachment.data}`;
          console.log(
            `[AIService/Cloudflare] Adding image with data URL length: ${imageDataUrl.length}`
          );
          contentParts.push({
            type: "image",
            image: imageDataUrl,
          });
        }
      }

      messages.push({ role: "user", content: contentParts });
      console.log(
        `[AIService/Cloudflare] User message has ${contentParts.length} content parts`
      );
    } else {
      messages.push({ role: "user", content: request.message });
    }

    console.log(`[AIService/Cloudflare] Total messages: ${messages.length}`);
    console.log(
      "[AIService/Cloudflare] Last message:",
      JSON.stringify(messages[messages.length - 1], null, 2)
    );

    let tools: any[] | undefined;
    if (request.isFirstMessage) {
      tools = [
        {
          type: "function",
          function: {
            name: "set_chat_title",
            description:
              "Sets the title of the conversation based on the user's intent.",
            parameters: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "The concise title (max 40 chars).",
                },
              },
              required: ["title"],
            },
          },
        },
      ];
    }

    const response = await fetch(`${workerUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "@cf/meta/llama-4-scout-17b-16e-instruct",
        messages,
        max_tokens: 4096,
        temperature: 0.2,
        stream: false,
        tools,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Cloudflare Worker Error: ${err}`);
    }

    const json = await response.json();
    console.log(
      "[AIService/Cloudflare] Full Response JSON:",
      JSON.stringify(json, null, 2)
    );

    const choice = json.choices?.[0];
    if (!choice) {
      throw new Error("Invalid response format from Cloudflare Worker");
    }

    console.log(
      "[AIService/Cloudflare] choice.message:",
      JSON.stringify(choice.message, null, 2)
    );
    console.log(
      "[AIService/Cloudflare] choice.finish_reason:",
      choice.finish_reason
    );

    const message = choice.message || {};
    const content = message.content || "";
    const toolCalls = message.tool_calls || [];

    console.log(`[AIService/Cloudflare] toolCalls count: ${toolCalls.length}`);
    console.log(
      "[AIService/Cloudflare] toolCalls:",
      JSON.stringify(toolCalls, null, 2)
    );

    if (toolCalls.length > 0 && options.onTitle) {
      for (const toolCall of toolCalls) {
        if (toolCall.function?.name === "set_chat_title") {
          try {
            const args = JSON.parse(toolCall.function.arguments || "{}");
            if (args.title) {
              console.log(`[AIService] Extracted title: ${args.title}`);
              options.onTitle(args.title);
            }
          } catch (e) {
            console.error("[AIService] Failed to parse tool arguments:", e);
          }
        }
      }
    }

    if (json.tool_results && json.tool_results.length > 0) {
      for (const toolResult of json.tool_results) {
        try {
          const resultContent =
            typeof toolResult.content === "string"
              ? JSON.parse(toolResult.content)
              : toolResult.content;
          if (resultContent.success && resultContent.title && options.onTitle) {
            console.log(
              `[AIService] Tool result title: ${resultContent.title}`
            );
            options.onTitle(resultContent.title);
          }
        } catch (e) {
          console.error("[AIService] Failed to parse tool result:", e);
        }
      }
    }

    options.onToken(content);
    options.onComplete(content);
  }

  private async streamGroq(
    apiKey: string,
    request: AIRequest,
    options: StreamOptions
  ) {
    const messages = [
      {
        role: "system" as const,
        content: generateCMSSystemPrompt(
          request.context,
          request.isFirstMessage,
          false
        ),
      },
      ...request.history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: request.message },
    ];

    const groq = createGroq({ apiKey });

    const result = await streamText({
      model: groq("llama-3.3-70b-versatile"),
      messages,
      maxOutputTokens: 4096,
      temperature: 0.7,
    });

    let fullText = "";
    for await (const chunk of result.textStream) {
      options.onToken(chunk);
      fullText += chunk;
    }

    if (request.isFirstMessage && options.onTitle) {
      const titleMatch = fullText.match(/title[:\s]+["']?([^"'\n]+)["']?/i);
      if (titleMatch && titleMatch[1]) {
        const extractedTitle = titleMatch[1].trim().slice(0, 40);
        console.log(`[AIService/Groq] Extracted title: ${extractedTitle}`);
        options.onTitle(extractedTitle);
      }
    }

    options.onComplete(fullText);
  }
}

export const aiService = new AIService();
