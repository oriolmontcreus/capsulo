import type { TabsLayout, TabItem } from './tabs.types';
import type { Field } from '../core/types';
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

