import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { ComponentData, Field, Schema } from '@/lib/form-builder';
import { flattenFields } from '@/lib/form-builder/core/fieldHelpers';
import { iconThemeClasses } from '@/lib/form-builder/core/iconThemes';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { FieldRenderer } from '@/lib/form-builder/core/FieldRenderer';
import { HighlightedFieldWrapper } from '@/lib/form-builder/core/HighlightedFieldWrapper';
import { useTranslationData } from '@/lib/form-builder/context/TranslationDataContext';
import { useTranslation } from '@/lib/form-builder/context/TranslationContext';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Pencil, AlertTriangle } from 'lucide-react';
// Import FieldRegistry to ensure it's initialized
import '@/lib/form-builder/fields/FieldRegistry';

interface InlineComponentFormProps {
    component: ComponentData;
    schema: Schema;
    fields: Field[];
    onDataChange: (componentId: string, data: Record<string, any>) => void;
    onRename?: (componentId: string, alias: string) => void;
    validationErrors?: Record<string, string>;
    highlightedField?: string;
    highlightRequestId?: number;
}

/**
 * Recursively initializes field values from component data.
 * Handles Grid layouts, Tabs layouts, and individual data fields.
 * 
 * @param field - The field to initialize
 * @param componentData - The component data containing field values
 * @param targetObject - The object to populate with initialized values
 * @param defaultLocale - The default locale for extracting translation values
 */
function initializeFieldRecursive(
    field: Field,
    componentData: Record<string, any>,
    targetObject: Record<string, any>,
    defaultLocale: string
): void {
    // Handle Grid layout
    if (field.type === 'grid' && 'fields' in field) {
        const gridLayout = field as any;
        gridLayout.fields.forEach((nestedField: Field) => {
            initializeFieldRecursive(nestedField, componentData, targetObject, defaultLocale);
        });
    }
    // Handle Tabs layout
    else if (field.type === 'tabs' && 'tabs' in field) {
        const tabsLayout = field as any;
        tabsLayout.tabs.forEach((tab: any) => {
            if (Array.isArray(tab.fields)) {
                tab.fields.forEach((nestedField: Field) => {
                    initializeFieldRecursive(nestedField, componentData, targetObject, defaultLocale);
                });
            }
        });
    }
    // Handle data fields
    else if ('name' in field) {
        let defaultVal = (field as any).defaultValue;

        // Special handling for FileUpload fields
        if (field.type === 'fileUpload') {
            defaultVal = defaultVal ?? { files: [] };
        } else {
            defaultVal = defaultVal ?? '';
        }

        const fieldValue = componentData[field.name]?.value;
        const isTranslatable = componentData[field.name]?.translatable === true;

        // Handle translation format: only treat as translation map if explicitly marked as translatable
        // OR if the value looks like a translation map (object with default locale key) even if not marked translatable
        // This handles cases where nested fields (like in Repeaters) cause the parent to be saved with a localized structure
        if ((isTranslatable || (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue) && defaultLocale in fieldValue)) &&
            fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
            // Extract default locale value from translation object
            targetObject[field.name] = fieldValue[defaultLocale] ?? defaultVal;
        } else {
            // Handle simple values, object values (e.g., {url, label}), or FileUpload
            targetObject[field.name] = fieldValue ?? defaultVal;
        }
    }
}

export const InlineComponentForm: React.FC<InlineComponentFormProps> = ({
    component,
    schema,
    fields,
    onDataChange,
    onRename,
    validationErrors = {},
    highlightedField,
    highlightRequestId
}) => {
    const {
        currentComponent,
        currentFormData,
        updateMainFormValue
    } = useTranslationData();

    const { defaultLocale } = useTranslation();

    // Calculate error count for this component
    const errorCount = useMemo(() => {
        return Object.keys(validationErrors).length;
    }, [validationErrors]);

    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isEditingName, setIsEditingName] = useState(false);
    const [renameValue, setRenameValue] = useState(component.alias || '');

    // Clone icon with proper styling to inherit color
    const getStyledIcon = (icon: React.ReactNode) => {
        if (!icon) return null;

        if (React.isValidElement(icon)) {
            return React.cloneElement(icon as React.ReactElement<any>, {
                className: "h-4 w-4",
                style: { color: "currentColor" }
            });
        }

        return icon;
    };

    // Initialize form data when component or defaultLocale changes
    useEffect(() => {
        const initial: Record<string, any> = {};
        fields.forEach(field => initializeFieldRecursive(field, component.data, initial, defaultLocale));
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

    // The initialization is now handled by the single useEffect at line 131-136.

    // With the external store architecture, context updates are now atomic and don't cause
    // cascading re-renders, so we can update immediately instead of debouncing.
    // The local state update provides immediate UI feedback.

    const handleChange = (fieldName: string, value: any) => {
        // Update local state immediately for responsive UI
        setFormData(prev => ({ ...prev, [fieldName]: value }));
        // Update context atomically - the external store prevents cascading re-renders
        updateMainFormValue(fieldName, value);
    };

    const handleLayoutChange = (value: any) => {
        // When a layout (Grid/Tabs) changes, it returns an object with nested field values
        // We need to flatten these into the form data
        setFormData(prev => ({ ...prev, ...value }));
    };

    const handleRenameClick = () => {
        setRenameValue(component.alias || component.schemaName);
        setIsEditingName(true);
    };

    const handleRenameSave = () => {
        if (onRename) {
            const trimmedValue = renameValue.trim();
            // If the value equals the schema name, treat it as no alias
            const finalValue = trimmedValue === component.schemaName ? '' : trimmedValue;
            onRename(component.id, finalValue);
        }
        setIsEditingName(false);
    };

    const handleRenameCancel = () => {
        setRenameValue(component.alias || '');
        setIsEditingName(false);
    };

    // Memoize flattened fields for layout components to prevent recalculation on every render
    // This is a significant performance optimization for tab switching
    const layoutFieldsMap = useMemo(() => {
        const map: Record<string, ReturnType<typeof flattenFields>> = {};
        fields.forEach((field, index) => {
            if (field.type === 'grid' || field.type === 'tabs') {
                map[`layout-${index}`] = flattenFields([field]);
            }
        });
        return map;
    }, [fields]);

    return (
        <>
            <div id={`component-${component.id}`} className="py-8">
                <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-3">
                        {/* Icon */}
                        {schema.icon && (
                            <div className={cn(
                                "flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg",
                                schema.iconTheme
                                    ? iconThemeClasses[schema.iconTheme]
                                    : "bg-muted text-muted-foreground"
                            )}>
                                {getStyledIcon(schema.icon)}
                            </div>
                        )}
                        {/* Component Name */}
                        {isEditingName ? (
                            <div className="flex items-center gap-2">
                                <Input
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    placeholder={component.schemaName}
                                    className="h-8 max-w-xs"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleRenameSave();
                                        } else if (e.key === 'Escape') {
                                            handleRenameCancel();
                                        }
                                    }}
                                    autoFocus
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleRenameSave}
                                    className="h-8"
                                >
                                    Save
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleRenameCancel}
                                    className="h-8"
                                >
                                    Cancel
                                </Button>
                            </div>
                        ) : (
                            <h3 className="font-medium text-xl text-foreground/90">
                                {component.alias || component.schemaName}
                                {component.alias && (
                                    <span className="ml-2 text-sm text-muted-foreground font-normal">
                                        ({component.schemaName})
                                    </span>
                                )}
                                {errorCount > 0 && (
                                    <span className="ml-3 inline-flex items-center px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive rounded-full">
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        {errorCount} error{errorCount > 1 ? 's' : ''}
                                    </span>
                                )}
                            </h3>
                        )}
                    </div>

                    {/* Rename Button */}
                    {!isEditingName && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleRenameClick}
                            className="h-8"
                        >
                            <Pencil className="size-4" />
                        </Button>
                    )}
                </div>



                <FieldGroup className="pl-1">
                    {fields.map((field, index) => {
                        // Handle layouts (Grid, Tabs) - they don't have names
                        if (field.type === 'grid' || field.type === 'tabs') {
                            // Use memoized flattened fields instead of recalculating
                            const layoutKey = `layout-${index}`;
                            const nestedDataFields = layoutFieldsMap[layoutKey] || [];

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
                                    highlightedField={highlightedField}
                                    highlightRequestId={highlightRequestId}
                                />
                            );
                        }

                        // Handle data fields (they have names)
                        if ('name' in field) {
                            const isHighlighted = highlightedField === field.name;

                            return (
                                <HighlightedFieldWrapper
                                    key={field.name}
                                    fieldName={field.name}
                                    isHighlighted={isHighlighted}
                                    highlightRequestId={highlightRequestId}
                                >
                                    <FieldRenderer
                                        field={field}
                                        value={formData[field.name]}
                                        onChange={(value: any) => handleChange(field.name, value)}
                                        error={validationErrors?.[field.name]}
                                        fieldPath={field.name}
                                        componentData={component}
                                        formData={formData}
                                    />
                                </HighlightedFieldWrapper>
                            );
                        }

                        return null;
                    })}
                </FieldGroup>
            </div>
        </>
    );
};