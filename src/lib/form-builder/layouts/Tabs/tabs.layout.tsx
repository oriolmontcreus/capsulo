import React from 'react';
import type { TabsLayout } from './tabs.types';
import { DefaultTabsVariant } from './variants/default';
import { VerticalTabsVariant } from './variants/vertical';

interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

interface TabsFieldProps {
    field: TabsLayout;
    value: any;
    onChange: (value: any) => void;
    error?: string;
    fieldErrors?: Record<string, string>;
    componentData?: ComponentData;
    formData?: Record<string, any>;
    highlightedField?: string;
    highlightRequestId?: number;
}

export const TabsFieldComponent: React.FC<TabsFieldProps> = ({ field, value, onChange, error, fieldErrors, componentData, formData, highlightedField, highlightRequestId }) => {

    // Select variant component based on field configuration
    const variant = field.variant || 'default';

    switch (variant) {
        case 'vertical':
            return (
                <VerticalTabsVariant
                    field={field}
                    value={value}
                    onChange={onChange}
                    fieldErrors={fieldErrors}
                    componentData={componentData}
                    formData={formData}
                    highlightedField={highlightedField}
                    highlightRequestId={highlightRequestId}
                />
            );
        case 'default':
        default:
            return (
                <DefaultTabsVariant
                    field={field}
                    value={value}
                    onChange={onChange}
                    fieldErrors={fieldErrors}
                    componentData={componentData}
                    formData={formData}
                    highlightedField={highlightedField}
                    highlightRequestId={highlightRequestId}
                />
            );
    }
};
