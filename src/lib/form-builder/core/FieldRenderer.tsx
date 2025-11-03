import React from 'react';
import type { Field } from '../core/types';
import { TranslationIcon } from '@/components/admin/TranslationIcon';
import { useTranslation } from '../context/TranslationContext';
import { useTranslationData } from '../context/TranslationDataContext';
import type { TranslatableField } from '../core/translation.types';

interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

interface FieldRendererProps {
    field: Field;
    value: any;
    onChange: (value: any) => void;
    error?: string;
    fieldErrors?: Record<string, string>;
    fieldPath?: string; // Path for translation context
    componentData?: ComponentData; // Component context for translations
    formData?: Record<string, any>; // Current form data for the component
}

// This will be set by FieldRegistry to avoid circular dependency
let getFieldComponentFn: ((type: string) => React.ComponentType<any> | null) | null = null;

export const setFieldComponentGetter = (fn: (type: string) => React.ComponentType<any> | null) => {
    getFieldComponentFn = fn;
};

/**
 * Central field renderer that maps field types to their components.
 * This is used by layout components to render nested fields without circular dependencies.
 * Uses the FieldRegistry for O(1) lookup performance.
 * Memoized to prevent unnecessary re-renders when parent re-renders.
 * Enhanced with translation support for translatable fields.
 */
export const FieldRenderer: React.FC<FieldRendererProps> = React.memo(({ field, value, onChange, error, fieldErrors, fieldPath, componentData, formData }) => {
    if (!getFieldComponentFn) {
        console.error('FieldRenderer: getFieldComponent not initialized. Did you forget to import FieldRegistry?');
        return null;
    }

    const FieldComponent = getFieldComponentFn(field.type);

    if (!FieldComponent) {
        console.warn(`No component registered for field type: ${field.type}`);
        return null;
    }

    // Check if this is a translatable field and we have translation context
    let translationContext: any = null;
    let translationDataContext: any = null;
    try {
        translationContext = useTranslation();
        translationDataContext = useTranslationData();
    } catch {
        // Translation context not available, continue without translation features
    }

    // Check if field is translatable (only for data fields, not layouts)
    const isTranslatableField = 'translatable' in field && (field as TranslatableField).translatable === true;
    const showTranslationIcon = isTranslatableField && translationContext && fieldPath;

    console.log('FieldRenderer:', {
        fieldType: field.type,
        fieldName: 'name' in field ? field.name : 'layout',
        isTranslatableField,
        hasTranslationContext: !!translationContext,
        fieldPath,
        showTranslationIcon
    });

    // If this is a translatable field, modify the field to include translation icon in label
    if (showTranslationIcon) {
        const translationStatus = translationContext.getTranslationStatus(fieldPath);

        // Create a modified field with the translation icon in the label
        const modifiedField = {
            ...field,
            label: (
                <div className="flex items-center gap-2">
                    <span>{(field as any).label || (field as any).name}</span>
                    <TranslationIcon
                        fieldPath={fieldPath}
                        isTranslatable={true}
                        status={translationStatus}
                        onClick={() => {
                            console.log('TranslationIcon clicked!', { fieldPath });
                            // Set the component context before opening translation sidebar
                            if (translationDataContext && componentData && formData) {
                                console.log('Setting component context:', {
                                    componentId: componentData.id,
                                    fieldPath,
                                    formData,
                                    componentData: componentData.data
                                });
                                translationDataContext.setCurrentComponent(componentData);
                                translationDataContext.setCurrentFormData(formData);
                            } else {
                                console.log('Missing context data:', {
                                    hasTranslationDataContext: !!translationDataContext,
                                    hasComponentData: !!componentData,
                                    hasFormData: !!formData
                                });
                            }
                            if (translationContext) {
                                translationContext.openTranslationSidebar(fieldPath);
                            } else {
                                console.log('No translation context available');
                            }
                        }}
                    />
                </div>
            )
        };

        return <FieldComponent field={modifiedField} value={value} onChange={onChange} error={error} fieldErrors={fieldErrors} componentData={componentData} formData={formData} />;
    }

    // Regular field rendering without translation icon
    return <FieldComponent field={field} value={value} onChange={onChange} error={error} fieldErrors={fieldErrors} componentData={componentData} formData={formData} />;
}, (prevProps, nextProps) => {
    // Only re-render if value, error, fieldErrors, or fieldPath changed
    return (
        prevProps.value === nextProps.value &&
        prevProps.error === nextProps.error &&
        prevProps.fieldErrors === nextProps.fieldErrors &&
        prevProps.field === nextProps.field &&
        prevProps.fieldPath === nextProps.fieldPath
    );
});
