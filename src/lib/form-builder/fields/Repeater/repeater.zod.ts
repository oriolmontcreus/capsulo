import { z } from 'zod';
import type { RepeaterField } from './repeater.types';
import { flattenFields } from '../../core/fieldHelpers';
import { getZodConverter } from '../ZodRegistry';

export function repeaterToZod(field: RepeaterField, formData?: Record<string, any>): z.ZodTypeAny {
    // 1. Flatten fields inside the repeater (handle grids/tabs within repeater item)
    const itemFields = flattenFields(field.fields);

    // 2. Build schema for a single item
    const itemShape: Record<string, z.ZodTypeAny> = {};

    // We also need to include _id which is auto-generated
    itemShape['_id'] = z.string().optional();

    itemFields.forEach((subField) => {
        const converter = getZodConverter(subField.type);
        if (converter) {
            itemShape[subField.name] = converter(subField, formData);
        } else {
            itemShape[subField.name] = z.any();
        }
    });

    let schema = z.array(z.object(itemShape));

    // 3. Validation for array length
    if (field.minItems) {
        schema = schema.min(field.minItems, `Must have at least ${field.minItems} items`);
    }

    if (field.maxItems) {
        schema = schema.max(field.maxItems, `Cannot have more than ${field.maxItems} items`);
    }

    // 4. Custom validation (if needed, e.g. custom required check on array itself)
    // The 'required' prop isn't standard on RepeaterField in types provided (it has minItems instead),
    // but if it were there (as implied by generic 'required' conversation earlier), we'd handle it.
    // Checking types: RepeaterField has 'hidden', but not explicit 'required'. 'minItems' covers required-ness.

    return schema;
}
