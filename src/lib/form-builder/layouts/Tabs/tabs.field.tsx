import React from 'react';
import type { TabsLayout } from './tabs.types';
import { DefaultTabsVariant } from './variants/default';
import { VerticalTabsVariant } from './variants/vertical';

interface TabsFieldProps {
    field: TabsLayout;
    value: any;
    onChange: (value: any) => void;
    error?: string;
    fieldErrors?: Record<string, string>;
}

export const TabsFieldComponent: React.FC<TabsFieldProps> = ({ field, value, onChange, error, fieldErrors }) => {
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
                />
            );
    }
};
