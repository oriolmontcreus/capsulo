/**
 * AI Service for Capsulo CMS.
 * Routes requests to appropriate providers:
 * - Groq (Llama 3.3): Primary provider for text-only requests (fast inference)
 * - Cloudflare Workers AI (Llama 3.2 Vision): For requests with image attachments (vision)
 */

import { createGroq } from '@ai-sdk/groq';
import { streamText, type CoreMessage, type ImagePart } from 'ai';
import { z } from 'zod';
import type { MessageRole, Attachment, AIAction } from './types';
import { generateCMSSystemPrompt } from './prompts';

interface StreamOptions {
    onToken: (token: string) => void;
    onAction?: (action: AIAction) => void;
    onTitle?: (title: string) => void;
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
                console.log("[AIService] Routing to Cloudflare Workers AI (Llama 3.2 Vision) - Vision request");
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
            { role: "system", content: generateCMSSystemPrompt(request.context, request.isFirstMessage) },
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
            let buffer = "";
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Parse AI SDK Data Stream Protocol
                // Format: type:JSON\n
                // Types: 0 (text), b (tool call), ...
                let newlineIndex: number;
                while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                    const line = buffer.slice(0, newlineIndex).trim();
                    buffer = buffer.slice(newlineIndex + 1);

                    if (line.length < 3) continue;

                    const type = line[0];
                    const content = line.slice(2); // Skip type and ":"

                    try {
                        if (type === '0') { // Text chunk
                            const text = JSON.parse(content);
                            options.onToken(text);
                            fullText += text;
                        } else if (type === 'b' || type === '9' || type === '2') { // Tool call or Data
                            const data = JSON.parse(content);
                            // Support both 'b' (legacy/experimental), '9' (standard tool call), and '2' (standard data/tool call in some versions)
                            if (data.toolName === 'updateContent' && options.onAction) {
                                options.onAction(data.args as AIAction);
                            } else if (data.toolName === 'setChatTitle' && options.onTitle) {
                                options.onTitle(data.args.title);
                            } else if (data.type === 'tool-call' && data.toolName === 'updateContent' && options.onAction) {
                                // Sometimes wrapped in a type: tool-call object
                                options.onAction(data.args as AIAction);
                            }
                        }
                    } catch (e) {
                        console.error("[AIService] Failed to parse data stream line:", line, e);
                    }
                }
            }
            
            options.onComplete(fullText);
        } finally {
            reader.releaseLock();
        }
    }
    
    // --- Groq Implementation (using Vercel AI SDK) ---
    private async streamGroq(apiKey: string, request: AIRequest, options: StreamOptions) {
        const groq = createGroq({ apiKey });
        
        const coreMessages: CoreMessage[] = [
            { role: "system", content: generateCMSSystemPrompt(request.context, request.isFirstMessage) },
            ...request.history.map(m => ({
                role: m.role as any,
                content: m.content
            })),
            { role: "user", content: request.message }
        ];

        try {
            const result = streamText({
                model: groq('llama-3.3-70b-versatile'),
                messages: coreMessages,
                temperature: 0.7,
                maxTokens: 4096,
                tools: {
                    updateContent: {
                        description: 'Update a component content in the CMS',
                        parameters: z.object({
                            componentId: z.string(),
                            componentName: z.string().optional(),
                            data: z.record(z.any())
                        }),
                    },
                    setChatTitle: {
                        description: 'Set a descriptive title for the conversation',
                        parameters: z.object({
                            title: z.string().max(40)
                        }),
                    },
                },
            });

            let fullText = "";
            for await (const part of result.fullStream) {
                if (part.type === 'text-delta') {
                    options.onToken(part.textDelta);
                    fullText += part.textDelta;
                } else if (part.type === 'tool-call') {
                    if (part.toolName === 'updateContent' && options.onAction) {
                        options.onAction(part.args as any);
                    } else if (part.toolName === 'setChatTitle' && options.onTitle) {
                        options.onTitle(part.args.title);
                    }
                }
            }
            
            options.onComplete(fullText);
        } catch (error: any) {
            console.error("[AIService] Groq SDK Error:", error);
            throw error;
        }
    }
}

export const aiService = new AIService();
