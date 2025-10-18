import { z } from 'zod';
import type { Schema } from './types';
import { fieldToZod } from '../fields/ZodRegistry';

/**
 * Creates a Zod schema from a Schema definition
 * Uses the field registry to convert each field
 */
export function createZodSchema(schema: Schema) {
    const shape: Record<string, z.ZodTypeAny> = {};

    schema.fields.forEach(field => {
        shape[field.name] = fieldToZod(field);
    });

    return z.object(shape);
}

/**
 * Type helper to infer TypeScript types from a Schema
 */
export type InferSchemaType<T extends Schema> = z.infer<ReturnType<typeof createZodSchema>>;
