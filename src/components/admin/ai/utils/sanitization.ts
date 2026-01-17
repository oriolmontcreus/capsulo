import { DEFAULT_LOCALE } from "@/lib/i18n-utils";

/**
 * Sanitizes a single field value from CMS data structure.
 * Handles unwrapping { value, type } and picking the correct locale.
 */
export function sanitizeFieldValue(value: any, defaultLocale: string = DEFAULT_LOCALE): any {
    if (value === null || value === undefined) return value;
    
    let cleanValue = value;

    // 1. Unwrap CMS internal field structure { type, value, ... }
    if (value && typeof value === 'object' && 'value' in value && ('type' in value || 'translatable' in value)) {
        cleanValue = value.value;
    }

    // 2. Unwrap translation object if it's a locale object
    if (cleanValue && typeof cleanValue === 'object' && !Array.isArray(cleanValue)) {
        const keys = Object.keys(cleanValue);
        // Locale pattern: 2-letter language code, optionally followed by dash and 2+ letter region
        const localePattern = /^[a-z]{2}(-[A-Z]{2,})?$/;
        const allKeysAreLocales = keys.length > 0 && keys.every(k => localePattern.test(k));
        const hasStringValue = keys.some(k => typeof cleanValue[k] === 'string');
        
        if (allKeysAreLocales && hasStringValue) {
            cleanValue = cleanValue[defaultLocale] || cleanValue[keys[0]];
        }
    }
    
    return cleanValue;
}

/**
 * Sanitizes a full data object (like component data).
 */
export function sanitizeActionData(
    data: Record<string, any>,
    defaultLocale: string
): Record<string, any> {
    const sanitizedData: Record<string, any> = {};
    const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);
    
    Object.entries(data).forEach(([key, value]) => {
        if (forbiddenKeys.has(key)) return;
        sanitizedData[key] = sanitizeFieldValue(value, defaultLocale);
    });

    return sanitizedData;
}

/**
 * Converts a field value to a simple string for diffing/display.
 * Handles CMS nesting, translations, and complex types.
 */
export function flattenValue(value: any, defaultLocale: string = DEFAULT_LOCALE): string {
    const sanitized = sanitizeFieldValue(value, defaultLocale);
    
    if (sanitized === null || sanitized === undefined) return '';
    if (typeof sanitized === 'string') return sanitized;
    if (typeof sanitized === 'number' || typeof sanitized === 'boolean') return String(sanitized);
    
    if (Array.isArray(sanitized)) {
        return sanitized.map(item => flattenValue(item, defaultLocale)).filter(v => v !== '').join(' ');
    }
    
    if (typeof sanitized === 'object') {
        return Object.values(sanitized).map(v => flattenValue(v, defaultLocale)).filter(v => v !== '').join(' ');
    }
    
    return String(sanitized);
}
