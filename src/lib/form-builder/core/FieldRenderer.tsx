import React, { useMemo } from 'react';
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
const FieldRendererComponent: React.FC<FieldRendererProps> = ({ field, value, onChange, error, fieldErrors, fieldPath, componentData, formData }) => {
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
    const showTranslationIcon = isTranslatableField && translationContext && translationContext.isTranslationMode && fieldPath;

    // Minimal debug logging only for translation mode changes
    if (process.env.NODE_ENV === 'development' && 'name' in field && field.name && isTranslatableField) {
        // Initialize debug tracking map if it doesn't exist
        if (!(globalThis as any)._fieldRendererDebugMap) {
            (globalThis as any)._fieldRendererDebugMap = new Map();
        }

        // Only log when translation mode changes for translatable fields
        const debugKey = `${field.name}-${translationContext?.isTranslationMode}`;
        const lastDebugKey = (globalThis as any)._fieldRendererDebugMap.get(field.name);

        if (!lastDebugKey || lastDebugKey !== debugKey) {
            console.log(`🔍 FieldRenderer [${field.name}]: translation mode ${translationContext?.isTranslationMode ? 'ON' : 'OFF'}`);
            (globalThis as any)._fieldRendererDebugMap.set(field.name, debugKey);
        }
    }





    // Reactive translation status calculation that updates when translation data changes
    // Always call useMemo to avoid hooks order issues
    const translationStatus = useMemo((): TranslationStatus => {
        // Return early if we don't need translation status
        if (!showTranslationIcon || !componentData || !translationContext || !fieldPath) {
            return 'missing';
        }

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
                const hasValue = localeValue !== undefined && localeValue !== null && localeValue !== '';
                localeStatus[locale] = hasValue;
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
                if (translationValue !== undefined) {
                    // If translation exists in context, it overrides existing data
                    // Empty string = user cleared it = missing translation (red icon)
                    // Non-empty string = user filled it = has translation (green icon if all complete)
                    const hasValue = translationValue !== null && translationValue !== '';
                    localeStatus[locale] = hasValue;
                }
            });
        }

        // Count how many locales have translations
        const translatedCount = Object.values(localeStatus).filter(Boolean).length;
        const finalStatus = translatedCount === totalLocales ? 'complete' : 'missing';

        // Return status based on translation completeness (only 2 states)
        return finalStatus;
    }, [showTranslationIcon, componentData, translationContext, fieldPath, translationDataContext]);

    // If this is a translatable field, modify the field to include translation icon in label
    if (showTranslationIcon) {
        // Disable excessive logging for translation icon rendering
        // if (process.env.NODE_ENV === 'development') {
        //     console.log(`🌐 RENDERING TRANSLATION ICON for ${('name' in field) ? field.name : 'unknown'}!`);
        // }

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
                        key={`${fieldPath}-${translationStatus}`}
                        onClick={() => {
                            console.log(`🌐 Globe icon clicked for ${fieldPath}! Setting up translation context...`);

                            // Set the component context before opening translation sidebar
                            if (translationDataContext && componentData && formData) {
                                console.log(`🌐 Setting current component:`, componentData.id);
                                translationDataContext.setCurrentComponent(componentData);
                                translationDataContext.setCurrentFormData(formData);
                            }

                            if (translationContext) {
                                console.log(`🌐 Opening translation sidebar for ${fieldPath}`);
                                translationContext.openTranslationSidebar(fieldPath);
                            } else {
                                console.error('❌ No translation context available!');
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
};

export const FieldRenderer = React.memo(FieldRendererComponent);
