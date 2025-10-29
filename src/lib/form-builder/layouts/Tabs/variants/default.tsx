import React, { useCallback } from 'react';
import type { TabsLayout } from '../tabs.types';
import { FieldRenderer } from '../../../core/FieldRenderer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { Field } from '../../../core/types';

interface DefaultTabsVariantProps {
    field: TabsLayout;
    value: any;
    onChange: (value: any) => void;
    fieldErrors?: Record<string, string>;
}

// Memoized wrapper for tab fields
const TabFieldItem = React.memo<{
    childField: Field;
    fieldName: string;
    value: any;
    onChange: (fieldName: string, value: any) => void;
    error?: string;
    fieldErrors?: Record<string, string>;
}>(({ childField, fieldName, value, onChange, error, fieldErrors }) => {
    const handleChange = useCallback((newValue: any) => {
        onChange(fieldName, newValue);
    }, [fieldName, onChange]);

    return (
        <FieldRenderer
            field={childField}
            value={value}
            onChange={handleChange}
            error={error}
            fieldErrors={fieldErrors}
        />
    );
}, (prev, next) => {
    return (
        prev.value === next.value &&
        prev.error === next.error &&
        prev.fieldErrors === next.fieldErrors
    );
});

export const DefaultTabsVariant: React.FC<DefaultTabsVariantProps> = ({
    field,
    value,
    onChange,
    fieldErrors
}) => {
    // Generate unique ID for default tab (first tab)
    const defaultTab = field.tabs.length > 0 ? `tab-0` : undefined;

    // Memoized handler for nested field changes
    const handleNestedFieldChange = useCallback((fieldName: string, newValue: any) => {
        onChange({
            ...value,
            [fieldName]: newValue
        });
    }, [value, onChange]);

    return (
        <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList
                className={cn("grid select-none", field.className || "w-fit")}
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

                        return (
                            <TabFieldItem
                                key={fieldName}
                                childField={childField}
                                fieldName={fieldName}
                                value={nestedValue}
                                onChange={handleNestedFieldChange}
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
