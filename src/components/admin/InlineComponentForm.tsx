import React, { useState, useEffect, useRef } from 'react';
import type { ComponentData, Field } from '@/lib/form-builder';
import { flattenFields } from '@/lib/form-builder/core/fieldHelpers';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { FieldRenderer } from '@/lib/form-builder/core/FieldRenderer';
import { useTranslationData } from '@/lib/form-builder/context/TranslationDataContext';
import { useTranslation } from '@/lib/form-builder/context/TranslationContext';
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
    const {
        currentComponent,
        setCurrentComponent,
        currentFormData,
        setCurrentFormData,
        updateMainFormValue
    } = useTranslationData();

    const { defaultLocale } = useTranslation();

    // Log component initialization only once
    const hasLoggedRef = useRef(false);
    if (!hasLoggedRef.current) {
        // Count translatable fields recursively (including those inside layouts)
        const countTranslatableFields = (fieldList: Field[]): number => {
            let count = 0;
            fieldList.forEach(field => {
                if ('translatable' in field && field.translatable) {
                    count++;
                } else if (field.type === 'tabs' && 'tabs' in field) {
                    const tabsField = field as any;
                    tabsField.tabs.forEach((tab: any) => {
                        if (Array.isArray(tab.fields)) {
                            count += countTranslatableFields(tab.fields);
                        }
                    });
                } else if (field.type === 'grid' && 'fields' in field) {
                    const gridField = field as any;
                    count += countTranslatableFields(gridField.fields);
                }
            });
            return count;
        };

        console.log('📝 InlineComponentForm initialized:', {
            componentId: component.id,
            schemaName: component.schemaName,
            translatableFields: countTranslatableFields(fields)
        });
        hasLoggedRef.current = true;
    }
    const [formData, setFormData] = useState<Record<string, any>>({});

    // Initialize form data when component or defaultLocale changes
    useEffect(() => {
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
                const fieldValue = component.data[field.name]?.value;

                // Handle new translation format where value can be an object with locale keys
                if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
                    // Extract default locale value from translation object
                    initial[field.name] = fieldValue[defaultLocale] ?? defaultVal;
                } else {
                    // Handle simple value (backward compatibility)
                    initial[field.name] = fieldValue ?? defaultVal;
                }
            }
        };

        fields.forEach(initializeField);
        setFormData(initial);
    }, [component, fields, defaultLocale]);

    const previousCurrentFormDataRef = useRef<Record<string, any>>({});

    // Sync form data when translation context changes (for reverse binding)
    useEffect(() => {
        // Only sync if this is the current component being translated
        if (currentComponent?.id === component.id) {
            // Check if currentFormData has actually changed
            const hasCurrentFormDataChanged = Object.keys(currentFormData).some(
                fieldName => currentFormData[fieldName] !== previousCurrentFormDataRef.current[fieldName]
            );

            if (hasCurrentFormDataChanged) {
                // Update local form data with any changes from translation context
                const updatedFormData = { ...formData };
                let hasChanges = false;

                Object.keys(currentFormData).forEach(fieldName => {
                    if (currentFormData[fieldName] !== formData[fieldName]) {
                        updatedFormData[fieldName] = currentFormData[fieldName];
                        hasChanges = true;
                    }
                });

                if (hasChanges) {
                    setFormData(updatedFormData);
                }

                // Update the ref to track the current state
                previousCurrentFormDataRef.current = { ...currentFormData };
            }
        }
    }, [currentFormData, currentComponent, component.id]);

    // Update parent when form data changes (no validation)
    const onDataChangeRef = useRef(onDataChange);
    onDataChangeRef.current = onDataChange;

    useEffect(() => {
        onDataChangeRef.current(component.id, formData);
    }, [formData, component.id]);

    const handleChange = (fieldName: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
        // Also update the translation context for the default locale
        updateMainFormValue(fieldName, value);
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
                                fieldPath={`layout-${index}`}
                                componentData={component}
                                formData={formData}
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
                                fieldPath={field.name}
                                componentData={component}
                                formData={formData}
                            />
                        );
                    }

                    return null;
                })}
            </FieldGroup>
        </div>
    );
};