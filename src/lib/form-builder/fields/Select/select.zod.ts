import { z } from 'zod';
import type { SelectField } from './select.types';

/**
 * Converts a Select field to a Zod schema
 */
export function selectToZod(field: SelectField): z.ZodTypeAny {
    if (field.options.length === 0) {
        return z.string().optional();
    }

    // Extract valid values from options
    const validValues = field.options.map(opt => opt.value);

    let schema: z.ZodTypeAny;

    if (field.multiple) {
        schema = z.array(z.enum(validValues as [string, ...string[]]));
    } else {
        schema = z.enum(validValues as [string, ...string[]]);
    }

    if (!field.required || typeof field.required === 'function') {
        // Allow empty string or undefined for optional fields
        schema = schema.optional().or(z.literal(''));
    }

    return schema;
}
