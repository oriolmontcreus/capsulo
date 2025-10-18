import { z } from 'zod';
import type { TextareaField } from './textarea.types';

/**
 * Converts a Textarea field to a Zod schema
 */
export function textareaToZod(field: TextareaField): z.ZodTypeAny {
    let baseSchema = z.string();

    // Apply max length if specified
    if (field.maxLength) {
        baseSchema = baseSchema.max(field.maxLength, `Maximum ${field.maxLength} characters`);
    }

    if (!field.required) return baseSchema.optional();

    return baseSchema;
}
