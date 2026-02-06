/**
 * AI Service for Capsulo CMS.
 * Routes requests to appropriate providers using Vercel AI SDK:
 * - Groq (Llama 3.3): Primary provider for text-only requests (fast inference)
 * - Cloudflare Workers AI (Llama 4 Scout): For requests with image attachments (vision) and text fallback
 */

import { createGroq } from "@ai-sdk/groq";
import { streamText } from "ai";
import {
  AIServiceError,
  ConfigurationError,
  mapErrorToTypedError,
} from "./errors";
import { AIMode } from "./modelConfig";
import { getModelForRequest } from "./modelConfig";
import { generateCMSSystemPrompt } from "./prompts";
import { getRetryConfig, withRetry } from "./retry";
import type { Attachment, MessageRole } from "./types";

interface StreamOptions {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: AIServiceError) => void;
  onTitle?: (title: string) => void;
  onRetry?: (attempt: number, delayMs: number, errorMessage: string) => void;
  signal?: AbortSignal;
}

interface AIRequest {
  message: string;
  context: any;
  history: { role: MessageRole; content: string }[];
  isFirstMessage?: boolean;
  attachments?: Attachment[];
  mode?: AIMode;
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
    const mode = request.mode || AIMode.FAST;

    // If first message, generate title asynchronously (doesn't block streaming)
    if (request.isFirstMessage && options.onTitle) {
      this.generateTitleAsync(request.message, options.onTitle);
    }

    try {
      const config = getRetryConfig();
      console.log(
        `[AIService] Starting request - retries enabled: ${config.enabled}, maxRetries: ${config.maxRetries}`
      );

      await withRetry(
        async () => {
          if (hasAttachments) {
            await this.streamWithAttachments(request, options, mode);
          } else {
            await this.streamTextOnly(request, options, mode);
          }
        },
        (error) => {
          console.log(
            `[AIService] Error check: code=${error.code}, isRetryable=${error.isRetryable}`
          );
          return error.isRetryable;
        },
        (attempt, delayMs, errorMessage) => {
          const retryConfig = getRetryConfig();
          console.log(
            `[AIService] Scheduling retry ${attempt}/${retryConfig.maxRetries} in ${delayMs}ms`
          );
          if (options.onRetry) {
            options.onRetry(attempt, delayMs, errorMessage);
          }
        },
        undefined,
        options.signal
      );
    } catch (error) {
      const typedError =
        error instanceof AIServiceError
          ? error
          : mapErrorToTypedError(error, "AI Service");

      console.error("[AIService] Final error after retries:", typedError);
      options.onError(typedError);
    }
  }

  private async streamWithAttachments(
    request: AIRequest,
    options: StreamOptions,
    mode: AIMode
  ) {
    const cloudflareUrl = this.getCloudflareWorkerUrl();

    if (!cloudflareUrl) {
      throw new ConfigurationError(
        "Cloudflare Worker URL is not configured. Cannot process image attachments."
      );
    }

    console.log("[AIService] Vision request → Cloudflare Workers AI");
    await this.streamCloudflare(cloudflareUrl, request, options, mode);
  }

  private async streamTextOnly(
    request: AIRequest,
    options: StreamOptions,
    mode: AIMode
  ) {
    const groqKey = this.getGroqKey();
    const cloudflareUrl = this.getCloudflareWorkerUrl();

    if (groqKey) {
      console.log("[AIService] Text request → Groq (Llama 3.3)");
      await this.streamGroq(groqKey, request, options);
    } else if (cloudflareUrl) {
      const model = getModelForRequest(mode, false);
      console.log(
        `[AIService] Text request → Cloudflare Workers AI (${model})`
      );
      await this.streamCloudflare(cloudflareUrl, request, options, mode);
    } else {
      throw new ConfigurationError(
        "Please configure either Groq API key or Cloudflare Worker URL."
      );
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

  /**
   * Get CMS actions from conversation analysis
   * Called after streaming completes to detect content editing requests
   */
  async getCmsActions(
    messages: { role: string; content: string }[],
    context: any
  ): Promise<
    Array<{
      action: string;
      componentId: string;
      componentName: string;
      data: any;
    }>
  > {
    const workerUrl = this.getCloudflareWorkerUrl();
    if (!workerUrl) return [];

    try {
      console.log(
        `[AIService] Getting CMS actions for ${messages.length} messages`
      );

      const response = await fetch(`${workerUrl}/v1/cms-actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, context }),
      });

      if (!response.ok) {
        console.error(
          "[AIService] CMS actions request failed:",
          await response.text()
        );
        return [];
      }

      const data = await response.json();
      const actions = data.actions || [];
      console.log(`[AIService] Detected ${actions.length} CMS action(s)`);

      return actions;
    } catch (error) {
      console.error("[AIService] CMS actions error:", error);
      return [];
    }
  }

  /**
   * Classify user intent to determine if they want to edit content or just ask a question
   * @returns "edit" if user wants to modify content, "question" otherwise
   */
  async classifyIntent(message: string): Promise<"edit" | "question"> {
    const workerUrl = this.getCloudflareWorkerUrl();
    if (!workerUrl) {
      console.warn("[AIService] No worker URL, defaulting to 'question'");
      return "question";
    }

    try {
      console.log(
        `[AIService] Classifying intent for: "${message.slice(0, 40)}..."`
      );

      const response = await fetch(`${workerUrl}/v1/classify-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        console.error(
          "[AIService] Intent classification failed:",
          await response.text()
        );
        return "question";
      }

      const data = await response.json();
      const intent = data.intent === "edit" ? "edit" : "question";
      console.log(`[AIService] Intent classified as: "${intent}"`);

      return intent;
    } catch (error) {
      console.error("[AIService] Intent classification error:", error);
      return "question";
    }
  }

  private async streamCloudflare(
    workerUrl: string,
    request: AIRequest,
    options: StreamOptions,
    mode: AIMode = AIMode.FAST
  ) {
    const hasAttachments =
      request.attachments && request.attachments.length > 0;

    // Select model based on mode and attachments
    const model = getModelForRequest(mode, !!hasAttachments);

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
      `[AIService/Cloudflare] Streaming with ${messages.length} messages using ${model}`
    );

    // Check for cancellation before starting
    if (options.signal?.aborted) {
      throw new Error("Request cancelled");
    }

    // Stream the response
    const response = await fetch(`${workerUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4096,
        temperature: 0.2,
        stream: true,
      }),
      signal: options.signal,
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
    let isCancelled = false;

    // Set up abort handler
    const abortHandler = () => {
      isCancelled = true;
      reader.cancel().catch(() => { });
    };

    options.signal?.addEventListener("abort", abortHandler);

    try {
      while (!isCancelled) {
        const { done, value } = await reader.read();
        if (done) break;

        // Check for cancellation
        if (options.signal?.aborted) {
          isCancelled = true;
          break;
        }

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
      if (buffer.startsWith("data: ") && !isCancelled) {
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

      // If cancelled, throw cancellation error
      if (isCancelled) {
        throw new Error("Request cancelled");
      }
    } finally {
      options.signal?.removeEventListener("abort", abortHandler);
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

    // Check for cancellation before starting
    if (options.signal?.aborted) {
      throw new Error("Request cancelled");
    }

    const groq = createGroq({ apiKey });

    const result = await streamText({
      model: groq("llama-3.3-70b-versatile"),
      messages,
      maxOutputTokens: 4096,
      temperature: 0.7,
      abortSignal: options.signal,
    });

    let fullText = "";
    for await (const chunk of result.textStream) {
      // Check for cancellation in the loop
      if (options.signal?.aborted) {
        throw new Error("Request cancelled");
      }
      options.onToken(chunk);
      fullText += chunk;
    }

    console.log(`[AIService/Groq] Stream complete (${fullText.length} chars)`);
    options.onComplete(fullText);
  }
}

export const aiService = new AIService();
