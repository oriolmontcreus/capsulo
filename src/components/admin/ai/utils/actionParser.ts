import type { AIAction } from "@/lib/ai/types";

export function parseActionFromContent(content: string): { action: AIAction | null; parseError: string | null } {
    let parseError: string | null = null;
    
    // Support wrapped <cms-edit> ... </cms-edit> (Preferred)
    const xmlRegex = /<cms-edit>\s*([\s\S]*?)\s*<\/cms-edit>/;
    const xmlMatch = content.match(xmlRegex);
    if (xmlMatch && xmlMatch[1]) {
        try { 
            return { action: JSON.parse(xmlMatch[1].trim()), parseError: null }; 
        } catch (e) { 
            console.error("Failed to parse AI action XML/JSON", e);
            parseError = `Failed to parse action block: ${e instanceof Error ? e.message : 'Invalid JSON'}`;
            // Continue to try fallback format
        }
    }

    // Fallback to markdown code block
    const jsonBlockRegex = /```json\s*([\s\S]*?"action"\s*:\s*"update"[\s\S]*?)\s*```/;
    const match = content.match(jsonBlockRegex);
    if (match && match[1]) {
        try { 
            return { action: JSON.parse(match[1].trim()), parseError: null }; 
        } catch (e) { 
            console.error("Failed to parse AI action JSON", e);
            parseError = `Failed to parse action block: ${e instanceof Error ? e.message : 'Invalid JSON'}`;
        }
    }
    
    return { action: null, parseError };
}

export function stripActionBlock(content: string): string {
    // Removes the JSON/XML action block for display
    return content
        .replace(/<cms-edit>[\s\S]*?<\/cms-edit>/g, '')
        .replace(/```json\s*[\s\S]*?"action"\s*:\s*"update"[\s\S]*?\s*```/g, '')
        .trim();
}
