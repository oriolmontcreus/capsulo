import { useEffect } from 'react';
import type { ComponentData } from '@/lib/form-builder';
import { flattenFields } from '@/lib/form-builder/core/fieldHelpers';
import type { FormDataMap, DraftPersistenceConfig } from './types';
import { mergeTranslationIntoField } from './mergeUtils';

interface UseDraftPersistenceProps {
    /** Whether there are any changes to persist */
    hasChanges: boolean;
    /** Whether we're still in initial load phase */
    isInitialLoad: boolean;
    /** Current entities (components or variables) */
    entities: ComponentData[];
    /** Debounced form data */
    debouncedFormData: FormDataMap;
    /** Debounced translation data */
    debouncedTranslationData: Record<string, Record<string, Record<string, any>>>;
    /** Configuration */
    config: DraftPersistenceConfig;
}

/**
 * Hook to persist draft changes to storage (localStorage/IndexedDB).
 * Merges form data and translation data into entities before saving.
 */
export function useDraftPersistence({
    hasChanges,
    isInitialLoad,
    entities,
    debouncedFormData,
    debouncedTranslationData,
    config
}: UseDraftPersistenceProps): void {
    const { schemas, defaultLocale, saveDraft, onRevalidate } = config;

    useEffect(() => {
        if (!hasChanges || isInitialLoad) return;

        // Build data with form edits and translations merged in
        const mergedEntities = entities.map(entity => {
            const formData = debouncedFormData[entity.id];
            const schema = schemas.find(
                s => s.key === 'globals' || s.name === entity.schemaName
            );
            if (!schema) return entity;

            const flatFields = flattenFields(schema.fields);
            const mergedData: Record<string, { type: any; translatable?: boolean; value: any }> = {
                ...entity.data
            };

            // First, merge form data (default locale values)
            if (formData) {
                Object.entries(formData).forEach(([fieldName, value]) => {
                    const existingField = entity.data[fieldName];
                    const fieldDef = flatFields.find(f => f.name === fieldName);
                    const correctType = fieldDef?.type || existingField?.type || 'unknown';

                    if (existingField) {
                        // Handle translatable fields
                        if (
                            existingField.translatable &&
                            typeof existingField.value === 'object' &&
                            !Array.isArray(existingField.value)
                        ) {
                            mergedData[fieldName] = {
                                ...existingField,
                                type: correctType,
                                value: { ...existingField.value, [defaultLocale]: value }
                            };
                        } else {
                            mergedData[fieldName] = { ...existingField, type: correctType, value };
                        }
                    } else {
                        // New field
                        mergedData[fieldName] = { type: correctType, value };
                    }
                });
            }

            // Second, merge translation data (non-default locale values)
            Object.entries(debouncedTranslationData).forEach(([locale, localeData]) => {
                if (locale === defaultLocale) return;

                const entityTranslations = localeData[entity.id];
                if (!entityTranslations) return;

                Object.entries(entityTranslations).forEach(([fieldName, value]) => {
                    const existingField = mergedData[fieldName] || entity.data[fieldName];
                    if (!existingField) return;

                    const fieldDef = flatFields.find(f => f.name === fieldName);
                    const currentValue = mergedData[fieldName]?.value ?? existingField.value;

                    mergedData[fieldName] = mergeTranslationIntoField(
                        existingField,
                        fieldDef,
                        currentValue,
                        locale,
                        defaultLocale,
                        value
                    );
                });
            });

            return { ...entity, data: mergedData };
        });

        saveDraft(mergedEntities);
        onRevalidate?.();
    }, [
        hasChanges,
        isInitialLoad,
        entities,
        debouncedFormData,
        debouncedTranslationData,
        schemas,
        defaultLocale,
        saveDraft,
        onRevalidate
    ]);
}
