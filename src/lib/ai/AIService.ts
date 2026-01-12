/**
 * AI Service for Capsulo CMS.
 * Handles model routing, API communication, and streaming.
 */

import type { MessageRole } from './types';

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
}

const TOKEN_THRESHOLD = 6000; // Heuristic threshold for switching models

/**
 * Safely stringify an object to JSON, returning a fallback string if serialization fails
 * (e.g., due to circular references or other unserializable content).
 */
function safeStringify(obj: any): string {
    try {
        return JSON.stringify(obj);
    } catch {
        return '"[unserializable context]"';
    }
}

export class AIService {
    private getKeys() {
        if (typeof window === 'undefined') return { googleKey: null, groqKey: null };
        try {
            const googleKey = window.localStorage.getItem("capsulo-ai-google-key");
            const groqKey = window.localStorage.getItem("capsulo-ai-groq-key");
            return { googleKey, groqKey };
        } catch (error) {
            console.error("Failed to access API keys from storage:", error);
            return { googleKey: null, groqKey: null };
        }
    }

    private estimateTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }

    async generateStream(request: AIRequest, options: StreamOptions) {
        const { googleKey, groqKey } = this.getKeys();
        
        if (!googleKey && !groqKey) {
            options.onError(new Error("NO_KEYS: Please configure API keys in the Inspector settings."));
            return;
        }

        const contextStr = safeStringify(request.context);
        const contextTokens = this.estimateTokens(contextStr);
        const promptTokens = this.estimateTokens(request.message);
        const totalEstimatedTokens = contextTokens + promptTokens;

        console.log(`[AIService] Estimated tokens: ${totalEstimatedTokens} (Context: ${contextTokens}, Prompt: ${promptTokens})`);

        // Routing Logic
        let useGemini = false;

        // Force Gemini if context is large or complex task
        if (totalEstimatedTokens > TOKEN_THRESHOLD) {
            useGemini = true;
        } 
        
        // Force available key if the other is missing
        if (!groqKey) useGemini = true;
        if (!googleKey && groqKey) useGemini = false; // Fallback to Groq if only Groq exists

        // If explicitly requesting complex tasks (heuristic keyword check)
        const lowerMsg = request.message.toLowerCase();
        if (lowerMsg.includes("rewrite") || lowerMsg.includes("analyze") || lowerMsg.includes("structure")) {
            if (googleKey) useGemini = true;
        }

        try {
            if (useGemini && googleKey) {
                console.log("[AIService] Routing to Gemini 1.5 Flash");
                await this.streamGemini(googleKey, request, options);
            } else if (groqKey) {
                console.log("[AIService] Routing to Groq (Llama 3.3)");
                await this.streamGroq(groqKey, request, options);
            } else {
                throw new Error("No suitable model available for this request.");
            }
        } catch (error: any) {
            console.error("[AIService] Generation failed:", error);
            options.onError(error);
        }
    }

    private createSystemPrompt(context: any, isFirstMessage: boolean = false): string {
        const contextSafe = safeStringify(context).slice(0, 50000);
        
        let prompt = `You are an intelligent assistant integrated into Capsulo CMS.
Your goal is to help the user manage their content.

CONTEXT:
You have access to the current Page Data and Global Variables in JSON format.
${contextSafe} ... (truncated if too long to avoid huge costs, though 1.5 Flash handles 1M tokens)

INSTRUCTIONS:
1. Answer questions about the content.
2. If the user asks to EDIT content, you must generate a VALID JSON object representing the modified component data.
3. Wrap the JSON action block in <cms-edit> tags. Do NOT use markdown code blocks or "ACTION_JSON" labels for this block.
Format:
<cms-edit>
{ "action": "update", "componentId": "...", "componentName": "Human Readable Name", "data": { "fieldName": "text value" } }
</cms-edit>
IMPORTANT: For "data", provide only the field name and its content as a direct value (e.g. string, number, boolean). Do NOT wrap values in objects like {"value": ...} or include keys like "type" or "translatable". Use simple strings even for rich text fields (the system will handle formatting). For translatable fields, simply provide the string value for the current locale.
4. Be concise and helpful. Use Markdown for formatting your text responses, but never for the <cms-edit> block.
5. DO NOT mention internal technical details like JSON, data structures, field IDs, or "objects" in your text response. Speak naturally to the non-technical user (e.g., "I've updated the Hero title" instead of "I generated a JSON object to update the heroTitle field").
`;

        if (isFirstMessage) {
            prompt += `
5. AT THE BEGINNING of your response, you MUST provide a short, highly descriptive title for this new conversation (max 40 characters), wrapped in <chat_title> tags.
The title should capture the SPECIFIC INTENT of the user (e.g., "Updating Hero Section", "Translating Homepage", "Fixing Footer Links") rather than generic terms like "Chat" or "CMS Edit".
Format: <chat_title>Specific Title Here</chat_title>
`;
        }

        return prompt;
    }

    // --- Google Gemini Implementation (REST) ---
    private async streamGemini(apiKey: string, request: AIRequest, options: StreamOptions) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;
        
        const systemPrompt = this.createSystemPrompt(request.context, request.isFirstMessage);
        const messages = [
            ...request.history.map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
            })),
            { role: "user", parts: [{ text: request.message }] }
        ];

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: messages 
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Gemini API Error: ${err}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        if (!reader) throw new Error("Failed to read response stream");

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
                    if (!trimmed || !trimmed.startsWith("data: ")) continue;
                    
                    const dataStr = trimmed.slice(6);
                    if (dataStr === "[DONE]") continue; // Standard SSE end marker

                    try {
                        const json = JSON.parse(dataStr);
                        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) {
                            options.onToken(text);
                            fullText += text;
                        }
                    } catch (e) {
                        malformedChunkCount++;
                        
                        // Log in development to help debug API issues
                        if (process.env.NODE_ENV !== 'production') {
                            console.error('[AIService/Gemini] Failed to parse chunk:', {
                                error: e instanceof Error ? e.message : String(e),
                                dataStr: dataStr.substring(0, 200), // Truncate for readability
                                malformedCount: malformedChunkCount
                            });
                        }
                        
                        // If too many malformed chunks, this indicates a real API issue
                        if (malformedChunkCount > MAX_MALFORMED_CHUNKS) {
                            throw new Error(`Gemini API returned too many malformed chunks (${malformedChunkCount}). This may indicate an API issue.`);
                        }
                    }
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
            { role: "system", content: this.createSystemPrompt(request.context, request.isFirstMessage) },
            ...request.history.map(m => ({
                role: m.role,
                content: m.content
            })),
            { role: "user", content: request.message }
        ];

        // Qwen model decommissioned, switching to Llama 3.3
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
                            
                            // Log in development to help debug API issues
                            if (process.env.NODE_ENV !== 'production') {
                                console.error('[AIService/Groq] Failed to parse chunk:', {
                                    error: e instanceof Error ? e.message : String(e),
                                    dataStr: dataStr.substring(0, 200), // Truncate for readability
                                    malformedCount: malformedChunkCount
                                });
                            }
                            
                            // If too many malformed chunks, this indicates a real API issue
                            if (malformedChunkCount > MAX_MALFORMED_CHUNKS) {
                                throw new Error(`Groq API returned too many malformed chunks (${malformedChunkCount}). This may indicate an API issue.`);
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
