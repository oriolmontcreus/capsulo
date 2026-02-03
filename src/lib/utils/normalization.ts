/**
 * Normalizes a value by converting empty strings and nulls to undefined,
 * and filtering empty strings and nulls from arrays.
 * 
 * This is used to ensure that fields with no meaningful content are stored consistently
 * as undefined, which helps with change detection and avoids storing empty strings/nulls.
 * 
 * @param value - The value to normalize
 * @returns The normalized value or undefined if effectively empty
 */
export function normalizeValue<T = any>(value: T): T | undefined {
    if (value === ('' as any) || value === null || value === undefined) {
        return undefined;
    }

    if (Array.isArray(value)) {
        // Filter out empty strings and nulls from arrays
        return value.filter(v => v !== '' && v !== null) as any;
    }

    return value;
}
