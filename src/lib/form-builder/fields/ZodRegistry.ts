import { z } from 'zod';
import type { Field, FieldType } from '../core/types';
import { inputToZod } from './Input/input.zod';
import { textareaToZod } from './Textarea/textarea.zod';
import { selectToZod } from './Select/select.zod';
import { gridToZod } from '../layouts/Grid/grid.zod';

/**
 * Function that converts a field to a Zod schema
 */
type ZodConverter = (field: Field) => z.ZodTypeAny;

/**
 * Registry of Zod converters for each field type
 */
const zodRegistry: Record<FieldType, ZodConverter> = {
    input: inputToZod as ZodConverter,
    textarea: textareaToZod as ZodConverter,
    select: selectToZod as ZodConverter,
    grid: gridToZod as ZodConverter,
};

/**
 * Get the Zod converter for a specific field type
 */
export const getZodConverter = (type: FieldType): ZodConverter | null => {
    return zodRegistry[type] || null;
};

/**
 * Register a new Zod converter for a field type
 */
export const registerZodConverter = (type: FieldType, converter: ZodConverter): void => {
    zodRegistry[type] = converter;
};

/**
 * Convert a field to a Zod schema using the registry
 */
export const fieldToZod = (field: Field): z.ZodTypeAny => {
    const converter = getZodConverter(field.type);

    if (!converter) {
        console.warn(`No Zod converter found for field type: ${field.type}`);
        return z.any();
    }

    return converter(field);
};
