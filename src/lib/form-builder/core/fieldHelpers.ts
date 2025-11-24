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

/**
 * Retrieves a value from a nested object using a dot-notation path.
 * Handles array indices in the path.
 */
export function getNestedValue(obj: any, path: string): any {
    if (obj === null || obj === undefined) return undefined;

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
        if (current === null || current === undefined) return undefined;
        current = current[key];
    }

    return current;
}

/**
 * Sets a value in a nested object using a dot-notation path.
 * Creates nested objects or arrays as needed.
 * Returns a new object (immutable update).
 */
export function setNestedValue(obj: any, path: string, value: any): any {
    const newObj = obj ? JSON.parse(JSON.stringify(obj)) : {};
    const keys = path.split('.');
    let current = newObj;

    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        const nextKey = keys[i + 1];

        // If current[key] doesn't exist, create it
        if (current[key] === undefined || current[key] === null) {
            // If next key is a number, create an array, otherwise an object
            current[key] = isNaN(Number(nextKey)) ? {} : [];
        }

        current = current[key];
    }

    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;

    return newObj;
}