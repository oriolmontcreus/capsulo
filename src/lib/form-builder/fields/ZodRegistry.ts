import { z } from 'zod';
import type { Field, FieldType } from '../core/types';
import { inputToZod } from './Input/input.zod';
import { textareaToZod } from './Textarea/textarea.zod';
import { selectToZod } from './Select/select.zod';
import { switchToZod } from './Switch/switch.zod';
import { richeditorToZod } from './RichEditor/richeditor.zod';
import { fileUploadToZod } from './FileUpload/fileUpload.zod';
import { colorpickerToZod } from './ColorPicker/colorpicker.zod';

/**
 * Function that converts a field to a Zod schema
 */
type ZodConverter = (field: Field, formData?: Record<string, any>) => z.ZodTypeAny;

/**
 * Registry of Zod converters for each field type.
 * Note: Layouts (grid, tabs) are not included here because they don't store data.
 * Only data fields need validation.
 */
const zodRegistry: Record<FieldType, ZodConverter> = {
    input: inputToZod as ZodConverter,
    textarea: textareaToZod as ZodConverter,
    select: selectToZod as ZodConverter,
    switch: switchToZod as ZodConverter,
    richeditor: richeditorToZod as ZodConverter,
    fileUpload: fileUploadToZod as ZodConverter,
    colorpicker: colorpickerToZod as ZodConverter,
    // Layouts don't need validation - they're just UI containers
    grid: () => z.any().optional(),
    tabs: () => z.any().optional(),
    datefield: () => z.any().optional(),
    repeater: () => z.any().optional(),
};

/**
 * Get the Zod converter for a specific field type
 */
export const getZodConverter = (type: FieldType): ZodConverter | null => {
    return zodRegistry[type] || null;
};



/**
 * Convert a field to a Zod schema using the registry
 */
export const fieldToZod = (field: Field, formData?: Record<string, any>): z.ZodTypeAny => {
    const converter = getZodConverter(field.type);

    if (!converter) {
        console.warn(`No Zod converter found for field type: ${field.type}`);
        return z.any();
    }

    return converter(field, formData);
};
