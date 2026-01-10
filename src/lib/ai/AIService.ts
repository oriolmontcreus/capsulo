/**
 * AI Service for Capsulo CMS.
 * Handles model routing, API communication, and streaming.
 */

interface StreamOptions {
    onToken: (token: string) => void;
    onComplete: (fullText: string) => void;
    onError: (error: Error) => void;
}

interface AIRequest {
    message: string;
    context: any;
    history: { role: 'user' | 'assistant'; content: string }[];
}

const TOKEN_THRESHOLD = 6000; // Heuristic threshold for switching models

export class AIService {
    private getKeys() {
        const googleKey = localStorage.getItem("capsulo-ai-google-key");
        const groqKey = localStorage.getItem("capsulo-ai-groq-key");
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

        const contextStr = JSON.stringify(request.context);
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
        return `You are an intelligent assistant integrated into Capsulo CMS.
Your goal is to help the user manage their content.

CONTEXT:
You have access to the current Page Data and Global Variables in JSON format.
${JSON.stringify(context).slice(0, 50000)} ... (truncated if too long to avoid huge costs, though 1.5 Flash handles 1M tokens)

INSTRUCTIONS:
1. Answer questions about the content.
2. If the user asks to EDIT content, you must generate a VALID JSON object representing the modified component data.
3. Wrap the JSON action block in <cms-edit> tags. Do NOT use markdown code blocks or "ACTION_JSON" labels.
Format:
<cms-edit>
{ "action": "update", "componentId": "...", "data": { "fieldName": "text value" } }
</cms-edit>
IMPORTANT: For "data", provide only the field name and its content as a direct value (e.g. string, number, boolean). Do NOT wrap values in objects like {"value": ...} or include keys like "type" or "translatable". Use simple strings even for rich text fields (the system will handle formatting). For translatable fields, simply provide the string value for the current locale.
4. Be concise and helpful. Use Markdown for formatting.
`;
    }

    // --- Google Gemini Implementation (REST) ---
    private async streamGemini(apiKey: string, request: AIRequest, options: StreamOptions) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${apiKey}`;
        
        const messages = [
            { role: "user", parts: [{ text: this.createSystemPrompt(request.context) }] },
            ...request.history.map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
            })),
            { role: "user", parts: [{ text: request.message }] }
        ];

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: messages })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Gemini API Error: ${err}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        if (!reader) throw new Error("Failed to read response stream");

        // Buffer for the raw stream
        let buffer = "";
        let processedIndex = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            // Regex for finding text content in the JSON stream
            // Matches "text": "VALUE"
            // Note: This regex is simple and might fail on escaped quotes inside the string if not careful,
            // but for most standard text streams it works. '([^"\\]|\\.)*' handles escaped chars.
            const textRegex = /"text":\s*"((?:[^"\\]|\\.)*)"/g;
            
            // Set the search to start from where we left off (minus potential partial match safety margin)
            // Safety margin: 20 chars
            textRegex.lastIndex = Math.max(0, processedIndex - 20);

            let match;
            while ((match = textRegex.exec(buffer)) !== null) {
                // Determine if this match is "new" or we already processed it
                // Logic: If the match ends after our last processed index
                if (match.index >= processedIndex) {
                    let rawText = match[1];
                    // Decode common JSON escapes
                    const decodedText = rawText
                        .replace(/\\n/g, '\n')
                        .replace(/\\"/g, '"')
                        .replace(/\\\\/g, '\\');
                    
                    options.onToken(decodedText);
                    fullText += decodedText;
                    processedIndex = match.index + match[0].length;
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

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");
            
            for (const line of lines) {
                if (line.trim() === "") continue;
                if (line.trim() === "data: [DONE]") continue;
                if (line.startsWith("data: ")) {
                    const dataStr = line.slice(6);
                    try {
                        const json = JSON.parse(dataStr);
                        const content = json.choices[0]?.delta?.content || "";
                        if (content) {
                            options.onToken(content);
                            fullText += content;
                        }
                    } catch (e) {
                         // Some chunks might be split across packets which simple line splitting handles poorly,
                         // but for OpenAI format usually each line is a full JSON.
                         // ignoring parse errors for now.
                    }
                }
            }
        }
        
        options.onComplete(fullText);
    }
}

export const aiService = new AIService();
