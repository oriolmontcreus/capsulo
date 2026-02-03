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
      // Vision requests MUST use Cloudflare
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
      // Text-only requests: prefer Groq, fall back to Cloudflare
      const groqKey = this.getGroqKey();
      const cloudflareUrl = this.getCloudflareWorkerUrl();

      if (groqKey) {
        // Use Groq if available (faster for text)
        try {
          console.log("[AIService] Routing to Groq (Llama 3.3) - Text request");
          await this.streamGroq(groqKey, request, options);
        } catch (error: any) {
          console.error("[AIService] Groq generation failed:", error);
          options.onError(error);
        }
      } else if (cloudflareUrl) {
        // Fall back to Cloudflare if Groq not configured
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
        // No providers configured
        options.onError(
          new Error(
            "NO_KEYS: Please configure either the Groq API key or Cloudflare Worker URL in the Inspector settings."
          )
        );
      }
    }
  }

  // --- Cloudflare Workers AI Implementation ---
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

    // Build messages using SDK format
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

    // Build user message content
    if (hasAttachments) {
      // For multimodal, we need to format content as array
      const contentParts: any[] = [{ type: "text", text: request.message }];

      for (const attachment of request.attachments!) {
        if (attachment.type === "image") {
          // Llama 4 Scout expects data URL format
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

      // Add user message with content array
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

    // Call Cloudflare Worker directly using fetch
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
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Cloudflare Worker Error: ${err}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    if (!reader) throw new Error("Failed to read response stream");

    try {
      // Read and parse Cloudflare SSE stream
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed === "") continue;
          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.slice(6);
            try {
              const json = JSON.parse(dataStr);
              // Cloudflare AI returns { response: "text", tool_calls: [], p: "..." }
              const content = json.response || "";
              if (content) {
                options.onToken(content);
                fullText += content;
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }

      options.onComplete(fullText);
    } finally {
      reader.releaseLock();
    }
  }

  // --- Groq Implementation ---
  private async streamGroq(
    apiKey: string,
    request: AIRequest,
    options: StreamOptions
  ) {
    // Build messages
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

    const result = streamText({
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

    options.onComplete(fullText);
  }
}

export const aiService = new AIService();
