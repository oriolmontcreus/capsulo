/**
 * AI Service for Capsulo CMS.
 * Routes requests to appropriate providers:
 * - Groq (Llama 3.3): Primary provider for text-only requests (fast inference)
 * - Cloudflare Workers AI (Llama 4 Scout): For requests with image attachments (vision)
 */

import type { MessageRole, Attachment } from './types';
import { generateCMSSystemPrompt } from './prompts';

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
        if (typeof window === 'undefined') return null;
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
        const hasAttachments = request.attachments && request.attachments.length > 0;
        
        if (hasAttachments) {
            // Vision requests MUST use Cloudflare
            const cloudflareUrl = this.getCloudflareWorkerUrl();

            if (!cloudflareUrl) {
                options.onError(new Error("NO_CLOUDFLARE_URL: Please configure the Cloudflare Worker URL in settings to use image attachments."));
                return;
            }

            try {
                console.log("[AIService] Routing to Cloudflare Workers AI (Llama 4 Scout) - Vision request");
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
                    console.log("[AIService] Routing to Cloudflare Workers AI (no Groq key) - Text request");
                    await this.streamCloudflare(cloudflareUrl, request, options);
                } catch (error: any) {
                    console.error("[AIService] Cloudflare generation failed:", error);
                    options.onError(error);
                }
            } else {
                // No providers configured
                options.onError(new Error("NO_KEYS: Please configure either the Groq API key or Cloudflare Worker URL in the Inspector settings."));
            }
        }
    }

    // --- Cloudflare Workers AI Implementation ---
    private async streamCloudflare(workerUrl: string, request: AIRequest, options: StreamOptions) {
        const url = `${workerUrl}/api/ai/stream`;
        
        const messages = [
            // Pass allowMultimodal = true
            { role: "system", content: generateCMSSystemPrompt(request.context, request.isFirstMessage, true) },
            ...request.history.map(m => ({
                role: m.role,
                content: m.content
            })),
            { role: "user", content: request.message }
        ];

        // Collect all image attachments
        const imagesBase64 = request.attachments
            ?.filter(a => a.type === 'image')
            .map(a => `data:${a.mimeType};base64,${a.data}`) || [];

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages,
                images: imagesBase64
            })
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
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                if (chunk) {
                    options.onToken(chunk);
                    fullText += chunk;
                }
            }
            
            options.onComplete(fullText);
        } finally {
            reader.releaseLock();
        }
    }
    
    // --- Groq Implementation (OpenAI Compatible) ---
    private async streamGroq(apiKey: string, request: AIRequest, options: StreamOptions) {
        const url = "https://api.groq.com/openai/v1/chat/completions";
        
        const messages = [
            // Pass allowMultimodal = false
            { role: "system", content: generateCMSSystemPrompt(request.context, request.isFirstMessage, false) },
            ...request.history.map(m => ({
                role: m.role,
                content: m.content
            })),
            { role: "user", content: request.message }
        ];

        const model = "llama-3.3-70b-versatile"; 

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: model, 
                messages: messages,
                stream: true,
                temperature: 0.7,
                max_tokens: 4096 
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Groq API Error: ${err}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        if (!reader) throw new Error("Failed to read stream");

        try {
            let buffer = "";
            let malformedChunkCount = 0;
            const MAX_MALFORMED_CHUNKS = 10;
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed === "") continue;
                    if (trimmed === "data: [DONE]") continue;
                    if (trimmed.startsWith("data: ")) {
                        const dataStr = trimmed.slice(6);
                        try {
                            const json = JSON.parse(dataStr);
                            const content = json.choices[0]?.delta?.content || "";
                            if (content) {
                                options.onToken(content);
                                fullText += content;
                            }
                        } catch (e) {
                            malformedChunkCount++;
                            
                            if (process.env.NODE_ENV !== 'production') {
                                console.error('[AIService/Groq] Failed to parse chunk:', {
                                    error: e instanceof Error ? e.message : String(e),
                                    dataStr: dataStr.substring(0, 200),
                                    malformedCount: malformedChunkCount
                                });
                            }
                            
                            if (malformedChunkCount > MAX_MALFORMED_CHUNKS) {
                                throw new Error(`Groq API returned too many malformed chunks (${malformedChunkCount}).`);
                            }
                        }
                    }
                }
            }
            
            options.onComplete(fullText);
        } finally {
            reader.releaseLock();
        }
    }
}

export const aiService = new AIService();
