import React, { useMemo } from 'react';
import { FieldLabel as UIFieldLabel } from '@/components/ui/field';
import { TranslationIcon } from '@/components/admin/TranslationIcon';
import { useTranslation } from '../context/TranslationContext';
import type { TranslationStatus } from '../core/translation.types';

interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

interface FieldLabelProps {
    htmlFor?: string;
    required?: boolean | ((formData: any) => boolean);
    children: React.ReactNode;
    fieldPath?: string;
    translatable?: boolean;
    componentData?: ComponentData;
    formData?: Record<string, any>;
    className?: string;
}

/**
 * Enhanced FieldLabel component that automatically includes translation icons
 * for translatable fields. The icon shows translation completion status.
 * 
 * Translation status is computed from componentData, which receives merged
 * translation data from CMSManager after the autosave debounce completes.
 * This avoids constant recomputation on every keystroke.
 */
export const FieldLabel: React.FC<FieldLabelProps> = ({
    htmlFor,
    required,
    children,
    fieldPath,
    translatable = false,
    componentData,
    formData,
    className
}) => {
    // Check if we have translation context available
    let translationContext: any = null;
    try {
        translationContext = useTranslation();
    } catch {
        // Translation context not available, continue without translation features
    }

    // Show translation icon for translatable fields when translation is enabled in config
    const showTranslationIcon = translatable &&
        translationContext &&
        translationContext.availableLocales?.length > 1 &&
        fieldPath;

    // Helper function to get nested value
    const getNestedValue = (obj: any, path: string): any => {
        if (!path) return obj;
        const keys = path.split('.');
        let current = obj;
        for (const key of keys) {
            if (current === null || current === undefined) return undefined;
            current = current[key];
        }
        return current;
    };

    // Calculate translation status from componentData
    // componentData receives merged translation data from CMSManager after autosave
    const translationStatus = useMemo((): TranslationStatus => {
        if (!showTranslationIcon || !componentData || !translationContext || !fieldPath) {
            return 'missing';
        }

        const { availableLocales, defaultLocale } = translationContext;

        // Parse the field path to handle nested fields (e.g., "cards.0.title")
        const [topLevelFieldName, ...restPath] = fieldPath.split('.');
        const fieldData = componentData.data[topLevelFieldName];

        if (!fieldData) return 'missing';

        // For translatable fields, we always expect translations for ALL locales
        const localeStatus: Record<string, boolean> = {};

        // Initialize all locales as missing
        availableLocales.forEach((locale: string) => {
            localeStatus[locale] = false;
        });

        // Check field data (which now includes merged translation data from autosave)
        if (fieldData.value && typeof fieldData.value === 'object' && !Array.isArray(fieldData.value)) {
            // Check if this is a locale-keyed object (e.g., { en: ..., es: ..., fr: ... })
            const hasLocaleKeys = availableLocales.some((locale: string) => locale in fieldData.value);

            if (hasLocaleKeys) {
                // Locale-keyed format
                availableLocales.forEach((locale: string) => {
                    const localeValue = fieldData.value[locale];

                    // For nested paths (repeater fields), navigate into the structure
                    const finalValue = restPath.length > 0
                        ? getNestedValue(localeValue, restPath.join('.'))
                        : localeValue;

                    const hasValue = finalValue !== undefined && finalValue !== null && finalValue !== '';
                    localeStatus[locale] = hasValue;
                });
            } else {
                // Simple object value (not locale-keyed) - only counts for default locale
                const finalValue = restPath.length > 0
                    ? getNestedValue(fieldData.value, restPath.join('.'))
                    : fieldData.value;

                if (finalValue !== undefined && finalValue !== null && finalValue !== '') {
                    localeStatus[defaultLocale] = true;
                }
            }
        } else {
            // Simple value or array format - only counts for default locale
            const finalValue = restPath.length > 0
                ? getNestedValue(fieldData.value, restPath.join('.'))
                : fieldData.value;

            if (finalValue !== undefined && finalValue !== null && finalValue !== '') {
                localeStatus[defaultLocale] = true;
            }
        }

        // Count how many locales have translations
        const translatedCount = Object.values(localeStatus).filter(Boolean).length;
        return translatedCount === availableLocales.length ? 'complete' : 'missing';
    }, [showTranslationIcon, componentData, translationContext, fieldPath]);

    // Determine if the field is required
    const isRequired = useMemo(() => {
        if (typeof required === 'function') {
            return required(formData || {});
        }
        return required;
    }, [required, formData]);

    return (
        <UIFieldLabel htmlFor={htmlFor} required={false} className={className}>
            {children}
            {isRequired && <span className="text-red-500/80">*</span>}
            {showTranslationIcon && (
                <TranslationIcon
                    fieldPath={fieldPath}
                    isTranslatable={true}
                    status={translationStatus}
                />
            )}
        </UIFieldLabel>
    );
};