import React, { useState, useEffect } from 'react';
import type { ComponentData, Field } from '@/lib/form-builder';
import { flattenFields } from '@/lib/form-builder/core/fieldHelpers';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { FieldRenderer } from '@/lib/form-builder/core/FieldRenderer';
// Import FieldRegistry to ensure it's initialized
import '@/lib/form-builder/fields/FieldRegistry';

interface InlineComponentFormProps {
    component: ComponentData;
    fields: Field[];
    onDataChange: (componentId: string, data: Record<string, any>) => void;
    onDelete: () => void;
    validationErrors?: Record<string, string>;
}

export const InlineComponentForm: React.FC<InlineComponentFormProps> = ({
    component,
    fields,
    onDataChange,
    onDelete,
    validationErrors = {}
}) => {
    const [formData, setFormData] = useState<Record<string, any>>(() => {
        const initial: Record<string, any> = {};

        const initializeField = (field: Field) => {
            // Handle Grid layout
            if (field.type === 'grid' && 'fields' in field) {
                const gridLayout = field as any;
                gridLayout.fields.forEach((nestedField: Field) => {
                    initializeField(nestedField); // Recursive call
                });
            }
            // Handle Tabs layout
            else if (field.type === 'tabs' && 'tabs' in field) {
                const tabsLayout = field as any;
                tabsLayout.tabs.forEach((tab: any) => {
                    if (Array.isArray(tab.fields)) {
                        tab.fields.forEach((nestedField: Field) => {
                            initializeField(nestedField); // Recursive call
                        });
                    }
                });
            }
            // Handle data fields
            else if ('name' in field) {
                const defaultVal = (field as any).defaultValue ?? '';
                initial[field.name] = component.data[field.name]?.value ?? defaultVal;
            }
        };

        fields.forEach(initializeField);
        return initial;
    });

    // Update parent when form data changes (no validation)
    useEffect(() => {
        onDataChange(component.id, formData);
    }, [formData, component.id, onDataChange]);

    const handleChange = (fieldName: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
    };

    const handleLayoutChange = (value: any) => {
        // When a layout (Grid/Tabs) changes, it returns an object with nested field values
        // We need to flatten these into the form data
        setFormData(prev => ({ ...prev, ...value }));
    };

    return (
        <div id={`component-${component.id}`} className="py-8 border-b border-border/30 last:border-b-0">
            <div className="flex justify-between items-start mb-8">
                <h3 className="font-medium text-xl text-foreground/90">{component.schemaName}</h3>
                <Button variant="destructive" size="sm" onClick={onDelete} className="opacity-75 hover:opacity-100">
                    Delete
                </Button>
            </div>

            <FieldGroup className="pl-1">
                {fields.map((field, index) => {
                    // Handle layouts (Grid, Tabs) - they don't have names
                    if (field.type === 'grid' || field.type === 'tabs') {
                        // Reuse flattenFields to get all nested data fields
                        const nestedDataFields = flattenFields([field]);

                        // Map field names to their current values
                        const layoutValue: Record<string, any> = {};
                        nestedDataFields.forEach(dataField => {
                            layoutValue[dataField.name] = formData[dataField.name];
                        });

                        return (
                            <FieldRenderer
                                key={`layout-${index}`}
                                field={field}
                                value={layoutValue}
                                onChange={handleLayoutChange}
                                error={undefined}
                                fieldErrors={validationErrors}
                            />
                        );
                    }

                    // Handle data fields (they have names)
                    if ('name' in field) {
                        return (
                            <FieldRenderer
                                key={field.name}
                                field={field}
                                value={formData[field.name]}
                                onChange={(value: any) => handleChange(field.name, value)}
                                error={validationErrors?.[field.name]}
                            />
                        );
                    }

                    return null;
                })}
            </FieldGroup>
        </div>
    );
};