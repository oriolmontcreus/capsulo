import { useMemo } from 'react';
import type { ComponentData } from '@/lib/form-builder';
import { flattenFields } from '@/lib/form-builder/core/fieldHelpers';
import type { TranslationMergeConfig } from './types';
import { mergeTranslationIntoField, hasTranslationUpdatesForEntity } from './mergeUtils';

interface UseTranslationMergeProps {
    /** Current entities (components or variables) */
    entities: ComponentData[];
    /** Debounced translation data: locale -> entityId -> fieldName -> value */
    debouncedTranslationData: Record<string, Record<string, Record<string, any>>>;
    /** Configuration */
    config: TranslationMergeConfig;
}

/**
 * Hook to merge translation data into entities for display purposes.
 * This allows field labels to see updated translations without constant recomputation.
 * 
 * @returns Entities with merged translation data
 */
export function useTranslationMerge({
    entities,
    debouncedTranslationData,
    config
}: UseTranslationMergeProps): ComponentData[] {
    const { schemas, defaultLocale } = config;

    return useMemo(() => {
        return entities.map(entity => {
            const schema = schemas.find(
                s => entity.id === 'globals' ? s.key === 'globals' : s.name === entity.schemaName
            );
            if (!schema) return entity;

            // Check if there's any translation data for this entity
            if (!hasTranslationUpdatesForEntity(entity.id, debouncedTranslationData)) {
                return entity;
            }

            const flatFields = flattenFields(schema.fields);
            const mergedData: Record<string, { type: any; translatable?: boolean; value: any }> = {
                ...entity.data
            };

            // Merge translation data for all locales
            Object.entries(debouncedTranslationData).forEach(([locale, localeData]) => {
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
    }, [entities, debouncedTranslationData, schemas, defaultLocale]);
}
