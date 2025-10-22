import React from 'react';
import type { TabsLayout } from '../tabs.types';
import { FieldRenderer } from '../../../core/FieldRenderer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DefaultTabsVariantProps {
    field: TabsLayout;
    value: any;
    onChange: (value: any) => void;
    fieldErrors?: Record<string, string>;
}

export const DefaultTabsVariant: React.FC<DefaultTabsVariantProps> = ({
    field,
    value,
    onChange,
    fieldErrors
}) => {
    // Generate unique ID for default tab (first tab)
    const defaultTab = field.tabs.length > 0 ? `tab-0` : undefined;

    return (
        <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList
                className="grid w-fit select-none"
                style={{ gridTemplateColumns: `repeat(${field.tabs.length}, minmax(0, 1fr))` }}
            >
                {field.tabs.map((tab, index) => (
                    <TabsTrigger
                        key={`tab-${index}`}
                        value={`tab-${index}`}
                        className="flex items-center gap-2"
                    >
                        {tab.prefix && <span className="inline-flex shrink-0">{tab.prefix}</span>}
                        <span>{tab.label}</span>
                        {tab.suffix && <span className="inline-flex shrink-0">{tab.suffix}</span>}
                    </TabsTrigger>
                ))}
            </TabsList>

            {field.tabs.map((tab, tabIndex) => (
                <TabsContent
                    key={`tab-content-${tabIndex}`}
                    value={`tab-${tabIndex}`}
                    className="flex flex-col gap-7"
                >
                    {tab.fields.map((childField, fieldIndex) => {
                        // Only data fields have names, not layouts
                        const fieldName = 'name' in childField ? childField.name : `tab-${tabIndex}-field-${fieldIndex}`;
                        const nestedValue = value?.[fieldName];
                        const nestedError = fieldErrors && 'name' in childField ? fieldErrors[childField.name] : undefined;

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
                                error={nestedError}
                                fieldErrors={fieldErrors}
                            />
                        );
                    })}
                </TabsContent>
            ))}
        </Tabs>
    );
};
