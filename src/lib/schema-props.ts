import type { Schema, Field } from './form-builder/core/types';
import { createZodSchema, getSchemaDefaults } from './form-builder/core/schemaToZod';
import type { z } from 'zod';

/**
 * Helper to infer field value types from field definitions
 */
type FieldValueType<F extends Field> =
    F['type'] extends 'input' ? string :
    F['type'] extends 'textarea' ? string :
    F['type'] extends 'select'
    ? (F extends { multiple: true } ? string[] : string)
    : any;

/**
 * Helper to make fields optional based on required flag
 * 
 * The required() method is the source of truth for whether a field
 * can be undefined. This gives you explicit control over optionality.
 */
type OptionalIfNotRequired<F extends Field> =
    F extends { required: true }
    ? FieldValueType<F>                    // Required -> never undefined
    : FieldValueType<F> | undefined;       // Optional -> can be undefined

/**
 * Infer prop types from Schema
 */
export type SchemaProps<T extends Schema> = {
    [K in T['fields'][number]as K['name']]: OptionalIfNotRequired<K>
};

/**
 * Helper to get validated props with defaults from a schema
 * Use this in your Astro components to automatically handle props
 * 
 * @example
 * ```astro
 * ---
 * import { getSchemaProps } from '@/lib/schema-props';
 * import { HeroSchema } from '@/lib/form-builder/schemas/hero.schema';
 * 
 * const props = getSchemaProps(HeroSchema, Astro.props);
 * ---
 * <div>{props.title}</div>
 * ```
 */
export function getSchemaProps<T extends Schema>(
    schema: T,
    astroProps: Record<string, any>
): SchemaProps<T> {
    const defaults = getSchemaDefaults(schema);
    const zodSchema = createZodSchema(schema);

    // Merge defaults with provided props
    const mergedProps = { ...defaults, ...astroProps };

    // Validate and parse with Zod (using safeParse to handle errors gracefully)
    const result = zodSchema.safeParse(mergedProps);

    if (result.success) {
        return result.data as SchemaProps<T>;
    }

    // If validation fails, log warning and return defaults merged with raw props
    console.warn(`Schema validation failed for ${schema.name}:`, result.error.format());
    return mergedProps as SchemaProps<T>;
}
