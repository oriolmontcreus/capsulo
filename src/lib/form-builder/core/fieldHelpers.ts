import type { Field, DataField } from './types';

/**
 * Recursively extracts all data fields from a schema, flattening any layout containers.
 * Layouts (Grid, Tabs, etc.) don't store data themselves - only their nested fields do.
 * 
 * @example
 * Input:
 *   [Input('name'), Grid([Input('email'), Input('phone')])]
 * Output:
 *   [Input('name'), Input('email'), Input('phone')]
 */
export function flattenFields(fields: Field[]): DataField[] {
    const dataFields: DataField[] = [];

    for (const field of fields) {
        // Check if it's a layout (has nested fields)
        if ('fields' in field && Array.isArray(field.fields)) {
            // Recursively flatten nested fields
            const nestedFields = flattenFields(field.fields);
            dataFields.push(...nestedFields);
        } else {
            // It's a data field
            dataFields.push(field as DataField);
        }
    }

    return dataFields;
}