/**
 * Calculate GitHub-style diff statistics (additions and deletions)
 * using the 'diff' library for accurate character-level comparison.
 */
import { diffChars } from 'diff';
import { flattenValue } from './sanitization';
import { DEFAULT_LOCALE } from '@/lib/i18n-utils';

interface DiffStats {
    additions: number;
    deletions: number;
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
    newData: Record<string, any> | null | undefined,
    defaultLocale: string = DEFAULT_LOCALE
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

        // IMPORTANT: Use flattenValue to extract ONLY the comparable content.
        // This strips CMS metadata like { type: 'input', translatable: true }
        const prevText = flattenValue(prevValue, defaultLocale);
        const newText = flattenValue(newValue, defaultLocale);

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

