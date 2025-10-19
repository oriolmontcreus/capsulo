import React from 'react';
import type { TabsLayout } from './tabs.types';
import { FieldRenderer } from '../../core/FieldRenderer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TabsFieldProps {
    field: TabsLayout;
    value: any;
    onChange: (value: any) => void;
    error?: string;
}

export const TabsFieldComponent: React.FC<TabsFieldProps> = ({ field, value, onChange, error }) => {
    // Generate unique ID for default tab (first tab)
    const defaultTab = field.tabs.length > 0 ? `tab-0` : undefined;

    return (
        <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${field.tabs.length}, minmax(0, 1fr))` }}>
                {field.tabs.map((tab, index) => (
                    <TabsTrigger key={`tab-${index}`} value={`tab-${index}`} className="flex items-center gap-2">
                        {tab.icon && <span className="inline-flex">{tab.icon}</span>}
                        <span>{tab.label}</span>
                    </TabsTrigger>
                ))}
            </TabsList>

            {field.tabs.map((tab, tabIndex) => (
                <TabsContent key={`tab-content-${tabIndex}`} value={`tab-${tabIndex}`} className="space-y-4">
                    {tab.fields.map((childField, fieldIndex) => {
                        // Only data fields have names, not layouts
                        const fieldName = 'name' in childField ? childField.name : `tab-${tabIndex}-field-${fieldIndex}`;
                        const nestedValue = value?.[fieldName];

                        const handleNestedChange = (newValue: any) => {
                            onChange({
                                ...value,
                                [fieldName]: newValue
                            });
                        };

                        return (
                            <FieldRenderer
                                key={fieldName}
                                field={childField}
                                value={nestedValue}
                                onChange={handleNestedChange}
                                error={error}
                            />
                        );
                    })}
                </TabsContent>
            ))}
        </Tabs>
    );
};
