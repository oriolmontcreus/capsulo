import { useMemo } from 'react';
import type { ComponentData, Schema } from '@/lib/form-builder';
import { flattenFields } from '@/lib/form-builder/core/fieldHelpers';
import type { TranslationMergeConfig } from './types';

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
                s => s.key === 'globals' || s.name === entity.schemaName
            );
            if (!schema) return entity;

            // Check if there's any translation data for this entity
            let hasTranslationUpdates = false;
            for (const locale of Object.keys(debouncedTranslationData)) {
                if (debouncedTranslationData[locale]?.[entity.id]) {
                    hasTranslationUpdates = true;
                    break;
                }
            }

            // If no translation updates for this entity, return as-is
            if (!hasTranslationUpdates) return entity;

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
                    const correctType = fieldDef?.type || existingField.type || 'unknown';
                    const currentValue = mergedData[fieldName]?.value ?? existingField.value;
                    const isTranslationObject =
                        currentValue &&
                        typeof currentValue === 'object' &&
                        !Array.isArray(currentValue);

                    if (isTranslationObject) {
                        mergedData[fieldName] = {
                            ...existingField,
                            translatable: true,
                            type: correctType,
                            value: { ...currentValue, [locale]: value }
                        };
                    } else if (locale === defaultLocale) {
                        // For default locale, replace the value directly
                        mergedData[fieldName] = {
                            ...existingField,
                            type: correctType,
                            value
                        };
                    } else {
                        // Convert to translation object format
                        mergedData[fieldName] = {
                            ...existingField,
                            translatable: true,
                            type: correctType,
                            value: {
                                [defaultLocale]: currentValue,
                                [locale]: value
                            }
                        };
                    }
                });
            });

            return { ...entity, data: mergedData };
        });
    }, [entities, debouncedTranslationData, schemas, defaultLocale]);
}
