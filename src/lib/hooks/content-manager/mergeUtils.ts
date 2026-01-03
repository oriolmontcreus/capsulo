/**
 * Shared utility functions for merging translation data into entity fields
 */

import type { DataField } from '@/lib/form-builder/core/types';
import type { FieldMeta } from './types';

/**
 * Merges a translation value into an existing field, handling both existing
 * translation objects and converting simple values to translation format.
 * 
 * @param existingField - The existing field metadata
 * @param fieldDef - Optional field definition from schema
 * @param currentValue - Current value of the field
 * @param locale - Locale being set
 * @param defaultLocale - Default locale for fallback
 * @param value - The translation value to merge
 * @returns Updated field metadata with merged translation
 */
export function mergeTranslationIntoField(
    existingField: FieldMeta,
    fieldDef: DataField | undefined,
    currentValue: any,
    locale: string,
    defaultLocale: string,
    value: any
): FieldMeta {
    const correctType = fieldDef?.type || existingField.type || 'unknown';
    const isTranslationObject =
        currentValue &&
        typeof currentValue === 'object' &&
        !Array.isArray(currentValue);

    if (isTranslationObject) {
        return {
            ...existingField,
            translatable: true,
            type: correctType,
            value: { ...currentValue, [locale]: value }
        };
    } else if (locale === defaultLocale) {
        // For default locale, replace the value directly
        return {
            ...existingField,
            type: correctType,
            value
        };
    } else {
        // Convert to translation object format
        return {
            ...existingField,
            translatable: true,
            type: correctType,
            value: {
                [defaultLocale]: currentValue,
                [locale]: value
            }
        };
    }
}

/**
 * Checks if an entity has any translation updates in the provided translation data
 */
export function hasTranslationUpdatesForEntity(
    entityId: string,
    translationData: Record<string, Record<string, Record<string, any>>>
): boolean {
    for (const locale of Object.keys(translationData)) {
        if (translationData[locale]?.[entityId]) {
            return true;
        }
    }
    return false;
}
