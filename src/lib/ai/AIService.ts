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
}

const TOKEN_THRESHOLD = 6000; // Heuristic threshold for switching models

export class AIService {
    private getKeys() {
        if (typeof window === 'undefined') return { googleKey: null, groqKey: null };
        const googleKey = window.localStorage.getItem("capsulo-ai-google-key");
        const groqKey = window.localStorage.getItem("capsulo-ai-groq-key");
        return { googleKey, groqKey };
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

        let contextStr = "";
        try {
            contextStr = JSON.stringify(request.context);
        } catch {
            contextStr = '"[unserializable context]"';
        }
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

    private createSystemPrompt(context: any): string {
        let contextSafe = "";
        try {
            contextSafe = JSON.stringify(context).slice(0, 50000);
        } catch {
            contextSafe = "[unserializable context]";
        }

        return `You are an intelligent assistant integrated into Capsulo CMS.
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
{ "action": "update", "componentId": "...", "data": { "fieldName": "text value" } }
</cms-edit>
IMPORTANT: For "data", provide only the field name and its content as a direct value (e.g. string, number, boolean). Do NOT wrap values in objects like {"value": ...} or include keys like "type" or "translatable". Use simple strings even for rich text fields (the system will handle formatting). For translatable fields, simply provide the string value for the current locale.
4. Be concise and helpful. Use Markdown for formatting your text responses, but never for the <cms-edit> block.
`;
    }

    // --- Google Gemini Implementation (REST) ---
    private async streamGemini(apiKey: string, request: AIRequest, options: StreamOptions) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;
        
        const systemPrompt = this.createSystemPrompt(request.context);
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

        let buffer = "";
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
                    // Ignore malformed chunks
                }
            }
        }
        
        options.onComplete(fullText);
    }
    
    // --- Groq Implementation (OpenAI Compatible) ---
    private async streamGroq(apiKey: string, request: AIRequest, options: StreamOptions) {
        const url = "https://api.groq.com/openai/v1/chat/completions";
        
        const messages = [
            { role: "system", content: this.createSystemPrompt(request.context) },
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
                         // Buffer handling above should prevent partial JSON parse errors
                    }
                }
            }
        }
        
        options.onComplete(fullText);
    }
}

export const aiService = new AIService();
