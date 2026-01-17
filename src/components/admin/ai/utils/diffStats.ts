/**
 * Calculate GitHub-style diff statistics (additions and deletions)
 * using the 'diff' library for accurate character-level comparison.
 */
import { diffChars } from 'diff';

interface DiffStats {
    additions: number;
    deletions: number;
}

/**
 * Recursively extracts all string values from an object
 */
function extractAllStrings(obj: unknown): string[] {
    if (obj === null || obj === undefined) {
        return [];
    }
    
    if (typeof obj === 'string') {
        return [obj];
    }
    
    if (Array.isArray(obj)) {
        return obj.flatMap(item => extractAllStrings(item));
    }
    
    if (typeof obj === 'object') {
        return Object.values(obj).flatMap(value => extractAllStrings(value));
    }
    
    // For numbers, booleans, etc., convert to string
    return [String(obj)];
}

/**
 * Calculate diff stats between previous and new data using the diff library.
 * Returns the number of characters added (green) and removed (red).
 * 
 * IMPORTANT: Only compares fields that exist in newData (the AI's changes),
 * since newData only contains the fields the AI modified, not all fields.
 */
export function calculateDiffStats(
    previousData: Record<string, any> | null | undefined,
    newData: Record<string, any> | null | undefined
): DiffStats {
    if (!previousData || !newData) {
        return { additions: 0, deletions: 0 };
    }

    let additions = 0;
    let deletions = 0;

    // Only iterate over keys that the AI changed (keys in newData)
    // previousData contains ALL fields, newData contains only CHANGED fields
    for (const key of Object.keys(newData)) {
        const prevValue = previousData[key];
        const newValue = newData[key];

        // Handle nested "value" structure from CMS
        const prevActual = prevValue?.value ?? prevValue;
        // newData from AI is flat (already sanitized), not wrapped in { value: ... }
        const newActual = newValue;

        const prevStrings = extractAllStrings(prevActual);
        const newStrings = extractAllStrings(newActual);

        const prevText = prevStrings.join('');
        const newText = newStrings.join('');

        if (prevText !== newText) {
            // Use diff library for accurate character-level comparison
            const changes = diffChars(prevText, newText);
            
            for (const change of changes) {
                if (change.added) {
                    additions += change.value.length;
                } else if (change.removed) {
                    deletions += change.value.length;
                }
                // Unchanged parts are ignored
            }
        }
    }

    return { additions, deletions };
}

/**
 * Format diff stats for display (e.g., "+15 -8" or "+150" / "-42")
 */
export function formatDiffStats(stats: DiffStats): { 
    additionsText: string; 
    deletionsText: string;
    hasChanges: boolean;
} {
    return {
        additionsText: stats.additions > 0 ? `+${stats.additions}` : '',
        deletionsText: stats.deletions > 0 ? `-${stats.deletions}` : '',
        hasChanges: stats.additions > 0 || stats.deletions > 0
    };
}
