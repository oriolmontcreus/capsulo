import React, { useCallback, useState, useEffect, useMemo } from 'react';
import type { TabsLayout } from '../tabs.types';
import { FieldRenderer } from '../../../core/FieldRenderer';
import { HighlightedFieldWrapper } from '../../../core/HighlightedFieldWrapper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { Field } from '../../../core/types';
import { findTabIndexForField } from '../tabHelpers';
import { flattenFields } from '../../../core/fieldHelpers';

interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

interface DefaultTabsVariantProps {
    field: TabsLayout;
    value: any;
    onChange: (value: any) => void;
    fieldErrors?: Record<string, string>;
    componentData?: ComponentData;
    formData?: Record<string, any>;
    highlightedField?: string;
    highlightRequestId?: number;
}

// Memoized wrapper for tab fields
const TabFieldItem = React.memo<{
    childField: Field;
    fieldName: string;
    fieldPath: string;
    value: any;
    onChange: (fieldName: string, value: any) => void;
    error?: string;
    fieldErrors?: Record<string, string>;
    componentData?: ComponentData;
    formData?: Record<string, any>;
    highlightedField?: string;
    highlightRequestId?: number;
}>(({ childField, fieldName, fieldPath, value, onChange, error, fieldErrors, componentData, formData, highlightedField, highlightRequestId }) => {

    const handleChange = useCallback((newValue: any) => {
        onChange(fieldName, newValue);
    }, [fieldName, onChange]);

    // Only wrap data fields (those with names) with highlight wrapper
    const isHighlighted = highlightedField === fieldName && 'name' in childField;
    const fieldContent = (
        <FieldRenderer
            field={childField}
            value={value}
            onChange={handleChange}
            error={error}
            fieldErrors={fieldErrors}
            fieldPath={fieldPath}
            componentData={componentData}
            formData={formData}
            highlightedField={highlightedField}
            highlightRequestId={highlightRequestId}
        />
    );

    if ('name' in childField) {
        return (
            <HighlightedFieldWrapper
                fieldName={fieldName}
                isHighlighted={isHighlighted}
                highlightRequestId={highlightRequestId}
            >
                {fieldContent}
            </HighlightedFieldWrapper>
        );
    }

    return fieldContent;
}, (prev, next) => {
    return (
        prev.value === next.value &&
        prev.error === next.error &&
        prev.fieldErrors === next.fieldErrors &&
        prev.fieldPath === next.fieldPath &&
        prev.componentData === next.componentData &&
        prev.formData === next.formData &&
        prev.highlightedField === next.highlightedField &&
        prev.highlightRequestId === next.highlightRequestId
    );
});

export const DefaultTabsVariant: React.FC<DefaultTabsVariantProps> = ({
    field,
    value,
    onChange,
    fieldErrors,
    componentData,
    formData,
    highlightedField,
    highlightRequestId
}) => {

    // Generate unique ID for default tab (first tab)
    const defaultTab = field.tabs.length > 0 ? `tab-0` : undefined;

    // Initialize active tab based on highlighted field if present, otherwise use default
    const getInitialTab = () => {
        if (highlightedField) {
            const tabIndex = findTabIndexForField(field, highlightedField);
            if (tabIndex >= 0) {
                return `tab-${tabIndex}`;
            }
        }
        return defaultTab || '';
    };

    const [activeTab, setActiveTab] = useState<string>(getInitialTab());

    // Change tab automatically when a field is highlighted
    useEffect(() => {
        if (highlightedField) {
            const tabIndex = findTabIndexForField(field, highlightedField);
            if (tabIndex >= 0) {
                const tabValue = `tab-${tabIndex}`;
                setActiveTab(tabValue);
            }
        }
    }, [highlightedField, field, highlightRequestId]);

    // Memoized handler for nested field changes
    const handleNestedFieldChange = useCallback((fieldName: string, newValue: any) => {
        // Only send the changed field, not all values
        onChange({
            [fieldName]: newValue
        });
    }, [onChange]);

    // Calculate error counts per tab
    const tabErrorCounts = useMemo(() => {
        if (!fieldErrors || Object.keys(fieldErrors).length === 0) {
            return {};
        }

        const counts: Record<number, number> = {};

        field.tabs.forEach((tab, tabIndex) => {
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
    }, [field.tabs, fieldErrors]);

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList
                className={cn("flex flex-wrap select-none", field.className || "w-full h-auto")}
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
                        {tabErrorCounts[index] > 0 && (
                            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-medium bg-destructive text-destructive-foreground rounded-full">
                                {tabErrorCounts[index]}
                            </span>
                        )}
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
                                fieldPath={fieldName}
                                value={nestedValue}
                                onChange={handleNestedFieldChange}
                                error={nestedError}
                                fieldErrors={fieldErrors}
                                componentData={componentData}
                                formData={formData}
                                highlightedField={highlightedField}
                                highlightRequestId={highlightRequestId}
                            />
                        );
                    })}
                </TabsContent>
            ))}
        </Tabs>
    );
};
