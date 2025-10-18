import { z } from 'zod';
import type { TextareaField } from './textarea.types';

/**
 * Converts a Textarea field to a Zod schema
 */
export function textareaToZod(field: TextareaField): z.ZodTypeAny {
    let baseSchema = z.string();

    // Apply min length if specified
    if (field.minLength) {
        baseSchema = baseSchema.min(field.minLength, `Minimum ${field.minLength} characters required`);
    }

    // Apply max length if specified
    if (field.maxLength) {
        baseSchema = baseSchema.max(field.maxLength, `Maximum ${field.maxLength} characters allowed`);
    }

    if (!field.required) return baseSchema.optional();

    return baseSchema;
}
