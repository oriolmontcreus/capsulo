import { z } from 'zod';
import type { ColorPickerField } from './colorpicker.types';

/**
 * Converts a ColorPicker field to a Zod schema
 */
export function colorpickerToZod(field: ColorPickerField): z.ZodTypeAny {
    // Hex color validation regex (supports 3, 4, 6, or 8 digit hex colors)
    const hexColorRegex = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;

    let baseSchema = z.string().regex(hexColorRegex, 'Please enter a valid hex color (e.g., #FF0000)');

    if (!field.required) {
        return baseSchema.optional();
    }

    return baseSchema;
}
