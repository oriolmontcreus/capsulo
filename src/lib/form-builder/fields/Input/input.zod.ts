import { z } from 'zod';
import type { InputField } from './input.types';

/**
 * Converts an Input field to a Zod schema
 */
export function inputToZod(field: InputField): z.ZodTypeAny {
    let baseSchema = z.string();

    // Apply input type validation
    if (field.type === 'email') {
        baseSchema = baseSchema.email('Please enter a valid email address');
    } else if (field.type === 'url') {
        baseSchema = baseSchema.url('Please enter a valid URL');
    }

    if (!field.required) return baseSchema.optional();

    return baseSchema;
}
