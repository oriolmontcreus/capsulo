import { z } from 'zod';
import type { TextareaField } from './textarea.types';

/**
 * Converts a Textarea field to a Zod schema
 */
export function textareaToZod(field: TextareaField, formData?: Record<string, any>): z.ZodTypeAny {
    let baseSchema = z.string();

    // Apply min length if specified
    if (field.minLength) {
        baseSchema = baseSchema.min(field.minLength, `Minimum ${field.minLength} characters required`);
    }

    // Apply max length if specified
    if (field.maxLength) {
        baseSchema = baseSchema.max(field.maxLength, `Maximum ${field.maxLength} characters allowed`);
    }

    // Apply regex pattern validation if specified
    if (field.regex) {
        const regex = typeof field.regex === 'string' ? new RegExp(field.regex) : field.regex;
        baseSchema = baseSchema.regex(regex, 'Invalid format');
    }

    if (!field.required) return baseSchema.optional();

    if (typeof field.required === 'function') {
        return baseSchema.optional().superRefine((val, ctx) => {
            if (typeof field.required === 'function' && field.required(formData || {})) {
                if (val === undefined || val === null || val === '') {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: 'This field is required',
                    });
                }
            }
        });
    }

    return baseSchema;
}
