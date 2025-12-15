import { useMemo } from 'react';
import type { TabsLayout } from './tabs.types';
import { flattenFields } from '../../core/fieldHelpers';

/**
 * Finds the tab index that contains a specific field name
 * @param tabsLayout - The tabs layout configuration
 * @param fieldName - The name of the field to find
 * @returns The index of the tab containing the field, or -1 if not found
 */
export function findTabIndexForField(tabsLayout: TabsLayout, fieldName: string): number {
    for (let tabIndex = 0; tabIndex < tabsLayout.tabs.length; tabIndex++) {
        const tab = tabsLayout.tabs[tabIndex];
        const flattenedFields = flattenFields(tab.fields);

        // Check if any field in this tab matches the field name
        const hasField = flattenedFields.some(field =>
            'name' in field && field.name === fieldName
        );

        if (hasField) {
            return tabIndex;
        }
    }

    return -1;
}

/**
 * Custom hook to calculate error counts per tab
 * @param tabs - Array of tab configurations
 * @param fieldErrors - Record of field errors
 * @returns Record mapping tab index to error count
 */
export function useTabErrorCounts(
    tabs: TabsLayout['tabs'],
    fieldErrors?: Record<string, string>
): Record<number, number> {
    return useMemo(() => {
        if (!fieldErrors || Object.keys(fieldErrors).length === 0) {
            return {};
        }

        const counts: Record<number, number> = {};

        tabs.forEach((tab, tabIndex) => {
            // Get all field names in this tab (flatten in case of nested layouts)
            const tabFieldNames = flattenFields(tab.fields).map(f => f.name);

            // Count how many errors are in this tab
            const errorCount = tabFieldNames.filter(name => {
                // Check for direct field errors
                if (fieldErrors[name]) return true;
                // Check for nested field errors (e.g., repeater.0.fieldName)
                return Object.keys(fieldErrors).some(errorPath =>
                    errorPath.startsWith(`${name}.`)
                );
            }).length;

            if (errorCount > 0) {
                counts[tabIndex] = errorCount;
            }
        });

        return counts;
    }, [tabs, fieldErrors]);
}

