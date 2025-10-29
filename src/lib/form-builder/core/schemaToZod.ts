import { z } from 'zod';
import type { Schema } from './types';
import { fieldToZod } from '../fields/ZodRegistry';
import { flattenFields } from './fieldHelpers';

/**
 * Creates a Zod schema from a Schema definition
 * Uses the field registry to convert each field
 * Automatically flattens nested layouts (Grid, Tabs) to extract data fields
 */
export function createZodSchema(schema: Schema) {
    const shape: Record<string, z.ZodTypeAny> = {};

    // Flatten nested layouts to get all data fields
    const dataFields = flattenFields(schema.fields);

    dataFields.forEach(field => {
        shape[field.name] = fieldToZod(field);
    });

    return z.object(shape);
}

/**
 * Type helper to infer TypeScript types from a Schema
 */
export type InferSchemaType<T extends Schema> = z.infer<ReturnType<typeof createZodSchema>>;
