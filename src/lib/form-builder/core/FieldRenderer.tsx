import React, { useState, useEffect, useMemo } from 'react';
import type { Field } from '../core/types';
import { TranslationIcon } from '@/components/admin/TranslationIcon';
import { useTranslation } from '../context/TranslationContext';
import { useTranslationData } from '../context/TranslationDataContext';
import type { TranslatableField, TranslationStatus } from '../core/translation.types';

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



    // If this is a translatable field, modify the field to include translation icon in label
    if (showTranslationIcon) {
        // Reactive translation status calculation that updates when translation data changes
        const translationStatus = useMemo((): TranslationStatus => {
            if (!componentData || !translationContext) return 'missing';

            const { availableLocales, defaultLocale } = translationContext;
            const fieldData = componentData.data[fieldPath];

            if (!fieldData) return 'missing';

            // For translatable fields, we always expect translations for ALL locales
            const totalLocales = availableLocales.length;
            const localeStatus: Record<string, boolean> = {};

            // Initialize all locales as missing
            availableLocales.forEach((locale: string) => {
                localeStatus[locale] = false;
            });

            // Check existing field data
            if (fieldData.value && typeof fieldData.value === 'object' && !Array.isArray(fieldData.value)) {
                // New format with locale keys
                availableLocales.forEach((locale: string) => {
                    const localeValue = fieldData.value[locale];
                    if (localeValue !== undefined && localeValue !== null && localeValue !== '') {
                        localeStatus[locale] = true;
                    }
                });
            } else {
                // Simple value format - only counts for default locale
                if (fieldData.value !== undefined && fieldData.value !== null && fieldData.value !== '') {
                    localeStatus[defaultLocale] = true;
                }
            }

            // Check translation data context for unsaved changes (this can override existing data)
            if (translationDataContext?.translationData) {
                availableLocales.forEach((locale: string) => {
                    const translationValue = translationDataContext.translationData[locale]?.[fieldPath];
                    if (translationValue !== undefined && translationValue !== null && translationValue !== '') {
                        localeStatus[locale] = true;
                    }
                });
            }

            // Count how many locales have translations
            const translatedCount = Object.values(localeStatus).filter(Boolean).length;

            // Return status based on translation completeness
            if (translatedCount === 0) return 'missing';
            if (translatedCount === totalLocales) return 'complete';
            return 'partial';
        }, [
            componentData,
            translationContext,
            fieldPath,
            translationDataContext?.translationData, // This will trigger re-calculation when translations change
            translationDataContext?.currentFormData // This will trigger re-calculation when form data changes
        ]);

        // Debounced translation status to prevent too many updates
        const [debouncedTranslationStatus, setDebouncedTranslationStatus] = useState<TranslationStatus>(translationStatus);

        useEffect(() => {
            // Update immediately if status becomes complete (for better UX)
            if (translationStatus === 'complete') {
                setDebouncedTranslationStatus(translationStatus);
                return;
            }

            // Otherwise, debounce the update
            const timer = setTimeout(() => {
                setDebouncedTranslationStatus(translationStatus);
            }, 1000); // 1 second debounce

            return () => clearTimeout(timer);
        }, [translationStatus]);

        // Create a modified field with the translation icon in the label
        const modifiedField = {
            ...field,
            label: (
                <div className="flex items-center gap-2">
                    <span>{(field as any).label || (field as any).name}</span>
                    <TranslationIcon
                        fieldPath={fieldPath}
                        isTranslatable={true}
                        status={debouncedTranslationStatus}
                        onClick={() => {
                            // Set the component context before opening translation sidebar
                            if (translationDataContext && componentData && formData) {
                                translationDataContext.setCurrentComponent(componentData);
                                translationDataContext.setCurrentFormData(formData);
                            } else {
                                console.warn('❌ Missing context data:', {
                                    hasTranslationDataContext: !!translationDataContext,
                                    hasComponentData: !!componentData,
                                    hasFormData: !!formData
                                });
                            }

                            if (translationContext) {
                                translationContext.openTranslationSidebar(fieldPath);
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
    // Only re-render if essential props changed
    return (
        prevProps.value === nextProps.value &&
        prevProps.error === nextProps.error &&
        prevProps.fieldErrors === nextProps.fieldErrors &&
        prevProps.field === nextProps.field &&
        prevProps.fieldPath === nextProps.fieldPath &&
        prevProps.componentData === nextProps.componentData &&
        prevProps.formData === nextProps.formData
    );
});
