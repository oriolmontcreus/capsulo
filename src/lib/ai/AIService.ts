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

    // If first message, generate title asynchronously (doesn't block streaming)
    if (request.isFirstMessage && options.onTitle) {
      this.generateTitleAsync(request.message, options.onTitle);
    }

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
        console.log("[AIService] Vision request → Cloudflare Workers AI");
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
          console.log("[AIService] Text request → Groq (Llama 3.3)");
          await this.streamGroq(groqKey, request, options);
        } catch (error: any) {
          console.error("[AIService] Groq generation failed:", error);
          options.onError(error);
        }
      } else if (cloudflareUrl) {
        try {
          console.log(
            "[AIService] Text request → Cloudflare Workers AI (Llama 4)"
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

  /**
   * Generate conversation title asynchronously (doesn't block main response streaming)
   */
  private async generateTitleAsync(
    message: string,
    onTitle: (title: string) => void
  ) {
    const workerUrl = this.getCloudflareWorkerUrl();
    if (!workerUrl) return;

    try {
      console.log(
        `[AIService] Generating title for: "${message.slice(0, 40)}..."`
      );

      const response = await fetch(`${workerUrl}/v1/generate-title`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        console.error(
          "[AIService] Title generation failed:",
          await response.text()
        );
        return;
      }

      const data = await response.json();
      if (data.title) {
        console.log(`[AIService] Title generated: "${data.title}"`);
        onTitle(data.title);
      }
    } catch (error) {
      console.error("[AIService] Title generation error:", error);
    }
  }

  private async streamCloudflare(
    workerUrl: string,
    request: AIRequest,
    options: StreamOptions
  ) {
    const hasAttachments =
      request.attachments && request.attachments.length > 0;

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
          contentParts.push({
            type: "image",
            image: imageDataUrl,
          });
        }
      }

      messages.push({ role: "user", content: contentParts });
    } else {
      messages.push({ role: "user", content: request.message });
    }

    console.log(
      `[AIService/Cloudflare] Streaming with ${messages.length} messages`
    );

    // Stream the response
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

    // Read the streaming response
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    let fullText = "";
    let buffer = "";
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Add to buffer and process complete lines
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep incomplete line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              console.log("[AIService] Stream done");
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || "";
              if (content) {
                fullText += content;
                options.onToken(content);
              }
            } catch (e) {
              // Silent fail for partial data
            }
          }
        }
      }

      // Process any remaining data
      if (buffer.startsWith("data: ")) {
        const data = buffer.slice(6);
        if (data && data !== "[DONE]") {
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || "";
            if (content) {
              fullText += content;
              options.onToken(content);
            }
          } catch (e) {
            // Ignore final parse errors
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    console.log(
      `[AIService/Cloudflare] Stream complete (${fullText.length} chars)`
    );
    options.onComplete(fullText);
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

    console.log(`[AIService/Groq] Stream complete (${fullText.length} chars)`);
    options.onComplete(fullText);
  }
}

export const aiService = new AIService();
