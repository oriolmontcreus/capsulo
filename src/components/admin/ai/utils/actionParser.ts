import type { AIAction } from "@/lib/ai/types";

/**
 * Validates that a parsed object conforms to the AIAction interface.
 * Returns null if valid, or an error message if invalid.
 */
function validateAIAction(parsed: unknown): string | null {
    if (parsed === null || typeof parsed !== 'object') {
        return 'Parsed action must be an object';
    }
    
    const obj = parsed as Record<string, unknown>;
    
    if (obj.action !== 'update') {
        return `Invalid action type: expected 'update', got '${String(obj.action)}'`;
    }
    
    if (typeof obj.componentId !== 'string' || obj.componentId.trim() === '') {
        return 'Missing or invalid componentId: must be a non-empty string';
    }
    
    if (obj.data === null || typeof obj.data !== 'object' || Array.isArray(obj.data)) {
        return 'Missing or invalid data: must be a non-null object';
    }
    
    // Optional field validation
    if (obj.componentName !== undefined && typeof obj.componentName !== 'string') {
        return 'Invalid componentName: must be a string if provided';
    }
    
    return null;
}

export function parseActionFromContent(content: string): { action: AIAction | null; parseError: string | null } {
    let parseError: string | null = null;
    
    // Support wrapped <cms-edit> ... </cms-edit> (Preferred)
    const xmlRegex = /<cms-edit>\s*([\s\S]*?)\s*<\/cms-edit>/;
    const xmlMatch = content.match(xmlRegex);
    if (xmlMatch && xmlMatch[1]) {
        try { 
            const parsed = JSON.parse(xmlMatch[1].trim());
            const validationError = validateAIAction(parsed);
            if (validationError) {
                console.error("AI action validation failed:", validationError);
                parseError = `Invalid action structure: ${validationError}`;
                // Fall through to try fallback format
            } else {
                return { action: parsed as AIAction, parseError: null };
            }
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
            const parsed = JSON.parse(match[1].trim());
            const validationError = validateAIAction(parsed);
            if (validationError) {
                console.error("AI action validation failed:", validationError);
                parseError = `Invalid action structure: ${validationError}`;
            } else {
                return { action: parsed as AIAction, parseError: null };
            }
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
