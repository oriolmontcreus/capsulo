import { z } from 'zod';
import type { SwitchField } from './switch.types';

/**
 * Converts a Switch field to a Zod schema
 */
export function switchToZod(field: SwitchField): z.ZodTypeAny {
    let schema = z.boolean({
        required_error: 'This field is required',
        invalid_type_error: 'Please provide a valid boolean value',
    });

    // If not required, make it optional
    if (!field.required || typeof field.required === 'function') {
        return schema.optional();
    }

    return schema;
}
