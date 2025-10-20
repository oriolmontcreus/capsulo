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
        // Handle Grid layout (has 'fields' property)
        if (field.type === 'grid' && 'fields' in field && Array.isArray(field.fields)) {
            // Recursively flatten nested fields
            const nestedFields = flattenFields(field.fields);
            dataFields.push(...nestedFields);
        }
        // Handle Tabs layout (has 'tabs' property with array of tab objects)
        else if (field.type === 'tabs' && 'tabs' in field) {
            const tabsLayout = field as any;
            if (Array.isArray(tabsLayout.tabs)) {
                tabsLayout.tabs.forEach((tab: any) => {
                    if (Array.isArray(tab.fields)) {
                        const nestedFields = flattenFields(tab.fields);
                        dataFields.push(...nestedFields);
                    }
                });
            }
        }
        // It's a data field
        else {
            dataFields.push(field as DataField);
        }
    }

    return dataFields;
}