/**
 * Translation utilities and helper functions
 * 
 * This file contains utility functions for translation status calculation,
 * field path generation, navigation utilities, and data structure conversion.
 */

import type {
    FieldValue,
    TranslationStatus,
    FieldContext,
    ComponentData,
    I18nConfig
} from './translation.types';
import type { Field, DataField } from './types';

/**
 * Calculate translation status for a field
 * 
 * @param fieldValue The field value object
 * @param requiredLocales Array of locales that should have translations
 * @param defaultLocale The default locale
 * @returns Translation status: 'complete', 'partial', or 'missing'
 */
export function calculateTranslationStatus(
    fieldValue: FieldValue | undefined,
    requiredLocales: string[],
    defaultLocale: string
): TranslationStatus {
    // If field doesn't exist or is not translatable, return missing
    if (!fieldValue || !fieldValue.translatable) {
        return 'missing';
    }

    // If no translation values exist, return missing
    if (!fieldValue.values || typeof fieldValue.values !== 'object') {
        return 'missing';
    }

    const values = fieldValue.values;
    let hasTranslations = 0;
    let hasDefaultLocale = false;

    // Check each required locale
    for (const locale of requiredLocales) {
        const value = values[locale];
        const hasValue = value !== undefined && value !== null && value !== '';

        if (hasValue) {
            hasTranslations++;
            if (locale === defaultLocale) {
                hasDefaultLocale = true;
            }
        }
    }

    // If no translations at all, return missing
    if (hasTranslations === 0) {
        return 'missing';
    }

    // If all required locales have translations, return complete
    if (hasTranslations === requiredLocales.length) {
        return 'complete';
    }

    // If default locale is missing, return missing (default locale is required)
    if (!hasDefaultLocale) {
        return 'missing';
    }

    // Otherwise, return partial
    return 'partial';
}

/**
 * Generate field path for a field within a schema
 * 
 * @param fieldId The field identifier
 * @param parentPath Optional parent path for nested fields
 * @returns Field path string
 */
export function generateFieldPath(fieldId: string, parentPath?: string): string {
    if (parentPath) {
        return `${parentPath}.${fieldId}`;
    }
    return fieldId;
}

/**
 * Parse field path to extract components
 * 
 * @param fieldPath The field path string
 * @returns Object with path components
 */
export function parseFieldPath(fieldPath: string): {
    segments: string[];
    fieldId: string;
    parentPath?: string;
} {
    const segments = fieldPath.split('.');
    const fieldId = segments[segments.length - 1];
    const parentPath = segments.length > 1 ? segments.slice(0, -1).join('.') : undefined;

    return {
        segments,
        fieldId,
        parentPath,
    };
}

/**
 * Extract translatable fields from a schema
 * 
 * @param fields Array of fields from a schema
 * @param parentPath Optional parent path for nested fields
 * @returns Array of field paths for translatable fields
 */
export function extractTranslatableFields(fields: Field[], parentPath?: string): string[] {
    const translatableFields: string[] = [];

    function processField(field: Field, currentPath?: string) {
        const fieldPath = generateFieldPath(field.id || 'unknown', currentPath);

        // Check if this is a data field (not a layout)
        if ('translatable' in field && field.translatable) {
            translatableFields.push(fieldPath);
        }

        // Process nested fields in layouts
        if ('fields' in field && Array.isArray(field.fields)) {
            field.fields.forEach(nestedField => {
                processField(nestedField, fieldPath);
            });
        }
    }

    fields.forEach(field => processField(field, parentPath));

    return translatableFields;
}

/**
 * Generate field context for breadcrumb display
 * 
 * @param fieldPath The field path
 * @param schema The schema containing the field
 * @returns Field context with display information
 */
export function generateFieldContext(fieldPath: string, schema?: any): FieldContext {
    const { segments, fieldId } = parseFieldPath(fieldPath);

    // Generate display path (e.g., "Hero → Title")
    const displayPath = segments
        .map(segment => {
            // Convert camelCase/kebab-case to Title Case
            return segment
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/[-_]/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase());
        })
        .join(' → ');

    // Try to determine field type from schema if available
    let fieldType = 'input'; // Default fallback
    let fieldLabel = fieldId;

    if (schema && schema.fields) {
        // TODO: Implement schema traversal to find field type and label
        // This would require walking through the schema structure
    }

    return {
        displayPath,
        fieldPath,
        fieldType,
        fieldLabel,
    };
}

/**
 * Navigate through translatable fields
 * 
 * @param currentFieldPath Current field path
 * @param translatableFields Array of all translatable field paths
 * @param direction Navigation direction
 * @returns Next field path or null if no navigation possible
 */
export function navigateTranslatableFields(
    currentFieldPath: string | null,
    translatableFields: string[],
    direction: 'next' | 'prev'
): string | null {
    if (translatableFields.length === 0) {
        return null;
    }

    if (!currentFieldPath) {
        return translatableFields[0];
    }

    const currentIndex = translatableFields.indexOf(currentFieldPath);

    if (currentIndex === -1) {
        return translatableFields[0];
    }

    if (direction === 'next') {
        const nextIndex = (currentIndex + 1) % translatableFields.length;
        return translatableFields[nextIndex];
    } else {
        const prevIndex = currentIndex === 0 ? translatableFields.length - 1 : currentIndex - 1;
        return translatableFields[prevIndex];
    }
}

/**
 * Convert non-translatable field value to translatable format
 * 
 * @param fieldValue Current field value
 * @param defaultLocale The default locale to use for the existing value
 * @returns Converted field value in translatable format
 */
export function convertToTranslatableFormat(
    fieldValue: any,
    defaultLocale: string
): FieldValue {
    // If already in translatable format, return as-is
    if (fieldValue && typeof fieldValue === 'object' && fieldValue.translatable && fieldValue.values) {
        return fieldValue as FieldValue;
    }

    // Convert simple value to translatable format
    const simpleValue = fieldValue?.value ?? fieldValue;

    return {
        type: fieldValue?.type || 'input',
        translatable: true,
        values: {
            [defaultLocale]: simpleValue,
        },
    };
}

/**
 * Convert translatable field value to non-translatable format
 * 
 * @param fieldValue Translatable field value
 * @param locale Locale to extract value for
 * @param fallbackLocale Fallback locale if primary locale is missing
 * @returns Simple field value
 */
export function convertFromTranslatableFormat(
    fieldValue: FieldValue,
    locale: string,
    fallbackLocale?: string
): any {
    // If not translatable, return the simple value
    if (!fieldValue.translatable || !fieldValue.values) {
        return fieldValue.value;
    }

    // Try to get value for requested locale
    let value = fieldValue.values[locale];

    // If not found and fallback is provided, try fallback
    if ((value === undefined || value === null || value === '') && fallbackLocale) {
        value = fieldValue.values[fallbackLocale];
    }

    return value;
}

/**
 * Extract translated value with automatic fallback
 * 
 * @param fieldData Field data object
 * @param locale Requested locale
 * @param i18nConfig I18n configuration for fallback logic
 * @returns Extracted value with fallback applied
 */
export function getTranslatedValue(
    fieldData: any,
    locale: string,
    i18nConfig: I18nConfig
): any {
    if (!fieldData) {
        return undefined;
    }

    // If field is not translatable, return the simple value
    if (!fieldData.translatable || !fieldData.values) {
        return fieldData.value ?? fieldData;
    }

    // Try requested locale first
    let value = fieldData.values[locale];

    // If not found, try fallback locale
    if ((value === undefined || value === null || value === '') && i18nConfig.fallbackLocale) {
        value = fieldData.values[i18nConfig.fallbackLocale];
    }

    // If still not found, try default locale
    if ((value === undefined || value === null || value === '') && i18nConfig.defaultLocale) {
        value = fieldData.values[i18nConfig.defaultLocale];
    }

    // If still not found, try any available locale
    if ((value === undefined || value === null || value === '') && fieldData.values) {
        const availableLocales = Object.keys(fieldData.values);
        for (const availableLocale of availableLocales) {
            const availableValue = fieldData.values[availableLocale];
            if (availableValue !== undefined && availableValue !== null && availableValue !== '') {
                value = availableValue;
                break;
            }
        }
    }

    return value;
}

/**
 * Get all translations for a field
 * 
 * @param fieldData Field data object
 * @returns Object with all translations or empty object
 */
export function getAllTranslations(fieldData: any): Record<string, any> {
    if (!fieldData || !fieldData.translatable || !fieldData.values) {
        return {};
    }

    return { ...fieldData.values };
}

/**
 * Check if a field has any translations
 * 
 * @param fieldData Field data object
 * @returns Boolean indicating if field has translations
 */
export function hasTranslations(fieldData: any): boolean {
    if (!fieldData || !fieldData.translatable || !fieldData.values) {
        return false;
    }

    const values = fieldData.values;
    return Object.keys(values).some(locale => {
        const value = values[locale];
        return value !== undefined && value !== null && value !== '';
    });
}

/**
 * Get translation completeness percentage
 * 
 * @param fieldData Field data object
 * @param requiredLocales Array of required locales
 * @returns Percentage of completion (0-100)
 */
export function getTranslationCompleteness(
    fieldData: any,
    requiredLocales: string[]
): number {
    if (!fieldData || !fieldData.translatable || !fieldData.values || requiredLocales.length === 0) {
        return 0;
    }

    const values = fieldData.values;
    let completedCount = 0;

    for (const locale of requiredLocales) {
        const value = values[locale];
        if (value !== undefined && value !== null && value !== '') {
            completedCount++;
        }
    }

    return Math.round((completedCount / requiredLocales.length) * 100);
}

/**
 * Validate translation data structure
 * 
 * @param componentData Component data to validate
 * @param i18nConfig I18n configuration
 * @returns Validation result with errors
 */
export function validateTranslationData(
    componentData: ComponentData,
    i18nConfig: I18nConfig
): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!componentData.data) {
        errors.push('Component data is missing');
        return { isValid: false, errors };
    }

    // Validate each field
    for (const [fieldKey, fieldValue] of Object.entries(componentData.data)) {
        if (fieldValue.translatable) {
            // Validate translatable field structure
            if (!fieldValue.values || typeof fieldValue.values !== 'object') {
                errors.push(`Translatable field "${fieldKey}" is missing values object`);
                continue;
            }

            // Check if default locale has a value
            const defaultValue = fieldValue.values[i18nConfig.defaultLocale];
            if (defaultValue === undefined || defaultValue === null || defaultValue === '') {
                errors.push(`Translatable field "${fieldKey}" is missing value for default locale "${i18nConfig.defaultLocale}"`);
            }

            // Validate locale codes
            for (const locale of Object.keys(fieldValue.values)) {
                if (!i18nConfig.locales.includes(locale)) {
                    errors.push(`Field "${fieldKey}" contains translation for unsupported locale "${locale}"`);
                }
            }
        } else {
            // Validate non-translatable field structure
            if (fieldValue.value === undefined && fieldValue.values !== undefined) {
                errors.push(`Non-translatable field "${fieldKey}" should not have values object`);
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}