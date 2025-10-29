import type { Schema, Field, DataField } from './form-builder/core/types';
import { createZodSchema } from './form-builder/core/schemaToZod';

/**
 * Type definition for RichEditor value structure
 * Matches the format used by PlateJS editor with optional discussions
 */
export interface RichEditorValue {
    content: any[]; // Array of PlateJS TNode elements
    discussions?: any[]; // Optional discussions array
}

/**
 * Helper to infer field value types from field definitions
 */
type FieldValueType<F extends DataField> =
    F['type'] extends 'input' ? string :
    F['type'] extends 'textarea' ? string :
    F['type'] extends 'select'
    ? (F extends { multiple: true } ? string[] : string)
    : F['type'] extends 'switch' ? boolean
    : F['type'] extends 'richeditor' ? RichEditorValue
    : any;

/**
 * Helper to make fields optional based on required flag
 * 
 * The required() method is the source of truth for whether a field
 * can be undefined. This gives you explicit control over optionality.
 */
type OptionalIfNotRequired<F extends DataField> =
    F extends { required: true }
    ? FieldValueType<F>                    // Required -> never undefined
    : FieldValueType<F> | undefined;       // Optional -> can be undefined

/**
 * Helper to flatten one level of Grid layout
 */
type FlattenGrid<F extends Field> =
    F extends { type: 'grid'; fields: infer Fields }
    ? (Fields extends Field[] ? Fields[number] : never)
    : F;

/**
 * Helper to flatten one level of Tabs layout
 */
type FlattenTabs<F extends Field> =
    F extends { type: 'tabs'; tabs: infer Tabs }
    ? (Tabs extends { fields: infer TabFields }[] ? (TabFields extends Field[] ? TabFields[number] : never) : never)
    : F;

/**
 * Helper to flatten layouts (Grid and Tabs) up to 2 levels deep
 * This provides good type inference for most practical use cases
 */
type FlattenLayouts<F extends Field> =
    F extends DataField ? F :
    FlattenTabs<FlattenGrid<FlattenTabs<FlattenGrid<F>>>>;

/**
 * Infer prop types from Schema - only includes data fields, not layouts
 * Flattens Grid and Tabs layouts up to 2 levels deep for better type inference
 */
export type SchemaProps<T extends Schema> = {
    [F in FlattenLayouts<T['fields'][number]> as F extends DataField ? (F['name'] extends string ? F['name'] : never) : never]:
    Extract<FlattenLayouts<T['fields'][number]>, { name: F }> extends infer Field
    ? (Field extends DataField ? OptionalIfNotRequired<Field> : never)
    : never
};

/**
 * Helper to validate props from a schema
 * Use this in your Astro components to validate props with Zod
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
    const zodSchema = createZodSchema(schema);

    // Validate and parse with Zod (using safeParse to handle errors gracefully)
    const result = zodSchema.safeParse(astroProps);

    if (result.success) {
        return result.data as SchemaProps<T>;
    }

    // If validation fails, log warning and return raw props
    console.warn(`Schema validation failed for ${schema.name}:`, result.error.format());
    return astroProps as SchemaProps<T>;
}
