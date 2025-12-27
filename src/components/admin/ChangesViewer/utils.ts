/**
 * Normalizes "empty-ish" values for comparison.
 * Treats null, undefined, and empty string as equivalent (undefined).
 * For objects, recursively normalizes and checks if effectively empty.
 */
export const normalizeForComparison = (value: any): any => {
    if (value === null || value === undefined || value === '') return undefined;
    if (Array.isArray(value) && value.length === 0) return undefined;
    if (typeof value === 'object' && !Array.isArray(value)) {
        const keys = Object.keys(value);
        if (keys.length === 0) return undefined;
    }
    return value;
};