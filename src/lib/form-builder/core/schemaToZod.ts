import { z } from 'zod';
import type { Schema, Field } from './types';

/**
 * Converts a field to a Zod schema based on its type and configuration
 */
function fieldToZod(field: Field): z.ZodTypeAny {
    switch (field.type) {
        case 'input': {
            let baseSchema = z.string();

            // Apply input type validation
            if (field.inputType === 'email') {
                baseSchema = baseSchema.email('Please enter a valid email address');
            } else if (field.inputType === 'url') {
                baseSchema = baseSchema.url('Please enter a valid URL');
            }

            // Apply required/optional
            if (!field.required) {
                return baseSchema.optional();
            }

            return baseSchema;
        }

        case 'textarea': {
            let baseSchema = z.string();

            // Apply max length if specified
            if (field.maxLength) {
                baseSchema = baseSchema.max(field.maxLength, `Maximum ${field.maxLength} characters`);
            }

            // Apply required/optional
            if (!field.required) {
                return baseSchema.optional();
            }

            return baseSchema;
        }

        case 'select': {
            if (field.options.length === 0) {
                return z.string().optional();
            }

            // Extract valid values from options
            const validValues = field.options.map(opt => opt.value);

            let schema: z.ZodTypeAny;

            if (field.multiple) {
                // Multiple select returns array
                schema = z.array(z.enum(validValues as [string, ...string[]]));
            } else {
                // Single select
                schema = z.enum(validValues as [string, ...string[]]);
            }

            // Apply required/optional
            if (!field.required) {
                schema = schema.optional();
            }

            return schema;
        }

        default:
            return z.any();
    }
}

/**
 * Creates a Zod schema from a Schema definition
 */
export function createZodSchema(schema: Schema) {
    const shape: Record<string, z.ZodTypeAny> = {};

    schema.fields.forEach(field => {
        shape[field.name] = fieldToZod(field);
    });

    return z.object(shape);
}

/**
 * Extracts default values from a Schema based on field definitions
 */
export function getSchemaDefaults(schema: Schema): Record<string, any> {
    const defaults: Record<string, any> = {};

    schema.fields.forEach(field => {
        if (field.defaultValue !== undefined) {
            defaults[field.name] = field.defaultValue;
        } else {
            // Provide sensible defaults based on field type
            switch (field.type) {
                case 'input':
                case 'textarea':
                    defaults[field.name] = '';
                    break;
                case 'select':
                    if (field.multiple) {
                        defaults[field.name] = [];
                    } else if (field.options.length > 0) {
                        defaults[field.name] = field.options[0].value;
                    } else {
                        defaults[field.name] = '';
                    }
                    break;
            }
        }
    });

    return defaults;
}

/**
 * Type helper to infer TypeScript types from a Schema
 */
export type InferSchemaType<T extends Schema> = z.infer<ReturnType<typeof createZodSchema>>;
