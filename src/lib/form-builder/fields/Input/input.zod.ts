import { z } from 'zod';
import type { InputField } from './input.types';

/**
 * Converts an Input field to a Zod schema
 */
export function inputToZod(field: InputField): z.ZodTypeAny {
    // Number input validation
    if (field.inputType === 'number') {
        let numberSchema = z.number({
            required_error: 'This field is required',
            invalid_type_error: 'Please enter a valid number',
        });

        // Check for integer-only validation first
        if (field.allowDecimals === false || field.step === 1) {
            numberSchema = numberSchema.int('Please enter a whole number');
        }

        // Apply min value if specified
        if (field.min !== undefined) {
            numberSchema = numberSchema.min(field.min, `Minimum value is ${field.min}`);
        }

        // Apply max value if specified
        if (field.max !== undefined) {
            numberSchema = numberSchema.max(field.max, `Maximum value is ${field.max}`);
        }

        // Apply step validation for decimals (if not integer-only)
        if (field.step !== undefined && field.step !== 0 && field.step !== 1 && field.allowDecimals !== false) {
            const refinedSchema = numberSchema.refine(
                (val) => {
                    const remainder = (val - (field.min || 0)) % field.step!;
                    return Math.abs(remainder) < 0.0001; // Floating point tolerance
                },
                { message: `Value must be a multiple of ${field.step}` }
            );

            if (!field.required || typeof field.required === 'function') return refinedSchema.optional();
            return refinedSchema;
        }

        if (!field.required || typeof field.required === 'function') return numberSchema.optional();
        return numberSchema;
    }

    // Text-based input validation
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

    // Apply regex pattern validation if specified
    if (field.regex) {
        const regex = typeof field.regex === 'string' ? new RegExp(field.regex) : field.regex;
        baseSchema = baseSchema.regex(regex, 'Invalid format');
    }

    if (!field.required || typeof field.required === 'function') return baseSchema.optional();

    return baseSchema;
}
