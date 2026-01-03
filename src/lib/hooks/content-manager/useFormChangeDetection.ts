import { useMemo } from 'react';
import isEqual from 'lodash/isEqual';
import type { ComponentData } from '@/lib/form-builder';
import type { FormDataMap, ChangeDetectionConfig } from './types';
import { normalizeValue } from './types';

interface UseFormChangeDetectionProps {
    /** Debounced form data map (entityId -> fieldName -> value) */
    debouncedFormData: FormDataMap;
    /** Current entities (components or variables) */
    entities: ComponentData[];
    /** Configuration */
    config: ChangeDetectionConfig;
}

/**
 * Hook to detect form changes by comparing debounced form data against entity data.
 * Handles translation objects, nested objects, and normalizes empty values.
 * 
 * @returns boolean indicating if any form fields have changed
 */
export function useFormChangeDetection({
    debouncedFormData,
    entities,
    config
}: UseFormChangeDetectionProps): boolean {
    const { defaultLocale } = config;

    return useMemo(() => {
        return Object.keys(debouncedFormData).some(entityId => {
            const formData = debouncedFormData[entityId];
            const entity = entities.find(e => e.id === entityId);

            if (!entity || !formData) return false;

            return Object.entries(formData).some(([key, value]) => {
                const fieldMeta = entity.data[key];
                const entityFieldValue = fieldMeta?.value;

                const normalizedFormValue = normalizeValue(value);
                const normalizedEntityValue = normalizeValue(entityFieldValue);

                // Check if this is a translatable field with translation object
                const isTranslatableObject =
                    fieldMeta?.translatable &&
                    normalizedEntityValue &&
                    typeof normalizedEntityValue === 'object' &&
                    !Array.isArray(normalizedEntityValue);

                let isDifferent = false;

                if (isTranslatableObject) {
                    // Compare with default locale value from translation object
                    const localeValue = normalizedEntityValue[defaultLocale];
                    const normalizedLocaleValue = normalizeValue(localeValue);
                    isDifferent = normalizedLocaleValue !== normalizedFormValue;
                } else {
                    // Handle simple value or non-translatable structured objects
                    if (
                        normalizedEntityValue &&
                        typeof normalizedEntityValue === 'object' &&
                        normalizedFormValue &&
                        typeof normalizedFormValue === 'object'
                    ) {
                        // For structured objects (like fileUpload), use deep comparison
                        isDifferent = !isEqual(normalizedEntityValue, normalizedFormValue);
                    } else {
                        isDifferent = normalizedEntityValue !== normalizedFormValue;
                    }
                }

                return isDifferent;
            });
        });
    }, [debouncedFormData, entities, defaultLocale]);
}

interface UseTranslationChangeDetectionProps {
    /** Current translation data */
    translationData: Record<string, Record<string, Record<string, any>>>;
    /** Default locale to exclude from change detection */
    defaultLocale: string;
}

/**
 * Hook to detect if any translation data exists (non-default locales)
 * 
 * @returns boolean indicating if translation changes exist
 */
export function useTranslationChangeDetection({
    translationData,
    defaultLocale
}: UseTranslationChangeDetectionProps): boolean {
    return useMemo(() => {
        return Object.entries(translationData).some(([locale, localeData]) => {
            if (locale === defaultLocale) return false;
            // Any translation data (including empty values) should be considered a change
            return Object.values(localeData).some(
                componentData => Object.keys(componentData).length > 0
            );
        });
    }, [translationData, defaultLocale]);
}
