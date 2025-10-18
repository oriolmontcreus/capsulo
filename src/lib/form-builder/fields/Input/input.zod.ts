import { z } from 'zod';
import type { InputField } from './input.types';

/**
 * Converts an Input field to a Zod schema
 */
export function inputToZod(field: InputField): z.ZodTypeAny {
    let baseSchema = z.string();

    // Apply input type validation
    if (field.inputType === 'email') {
        baseSchema = baseSchema.email('Please enter a valid email address');
    } else if (field.inputType === 'url') {
        baseSchema = baseSchema.url('Please enter a valid URL');
    }

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
