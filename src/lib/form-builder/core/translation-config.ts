/**
 * Configuration validation utilities for the translation system
 */

import type { CapsuloConfig } from '@/lib/define-config';
import type {
    I18nConfig,
    TranslationValidationError,
    ConfigValidationResult
} from './translation.types';

/**
 * ISO 639-1 language codes for validation
 * This is a subset of commonly used language codes
 */
const VALID_LOCALE_CODES = new Set([
    'af', 'ar', 'bg', 'bn', 'ca', 'cs', 'cy', 'da', 'de', 'el', 'en', 'es', 'et', 'fa', 'fi', 'fr',
    'gu', 'he', 'hi', 'hr', 'hu', 'id', 'it', 'ja', 'ko', 'lt', 'lv', 'mk', 'ms', 'mt', 'nl', 'no',
    'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sq', 'sv', 'sw', 'ta', 'te', 'th', 'tl', 'tr', 'uk', 'ur',
    'vi', 'zh'
]);

/**
 * Validates a single locale code
 */
function isValidLocaleCode(locale: string): boolean {
    if (!locale || typeof locale !== 'string') {
        return false;
    }

    // Check if it's a valid ISO 639-1 code (2 letters) or extended format (e.g., en-US)
    const localePattern = /^[a-z]{2}(-[A-Z]{2})?$/;
    if (!localePattern.test(locale)) {
        return false;
    }

    // Extract base language code for validation
    const baseLocale = locale.split('-')[0];
    return VALID_LOCALE_CODES.has(baseLocale);
}

/**
 * Validates the i18n configuration from capsulo.config.ts
 */
function validateI18nConfig(config: CapsuloConfig['i18n']): ConfigValidationResult {
    const errors: TranslationValidationError[] = [];
    const warnings: string[] = [];

    // If no i18n config, it's valid (translation features disabled)
    if (!config) {
        return { isValid: true, errors: [], warnings: [] };
    }

    // Validate defaultLocale
    if (!config.defaultLocale) {
        errors.push({
            type: 'missing_default_locale',
            message: 'defaultLocale is required when i18n is configured'
        });
    } else if (!isValidLocaleCode(config.defaultLocale)) {
        errors.push({
            type: 'invalid_locale',
            message: `Invalid defaultLocale: "${config.defaultLocale}". Must be a valid ISO 639-1 language code (e.g., "en", "es", "fr")`,
            locale: config.defaultLocale
        });
    }

    // Validate locales array
    if (!config.locales || !Array.isArray(config.locales)) {
        errors.push({
            type: 'empty_locales',
            message: 'locales array is required and must contain at least one locale'
        });
    } else {
        // Check if locales array is empty
        if (config.locales.length === 0) {
            errors.push({
                type: 'empty_locales',
                message: 'locales array must contain at least one locale'
            });
        }

        // Validate each locale in the array
        const seenLocales = new Set<string>();
        for (const locale of config.locales) {
            if (!isValidLocaleCode(locale)) {
                errors.push({
                    type: 'invalid_locale',
                    message: `Invalid locale in locales array: "${locale}". Must be a valid ISO 639-1 language code`,
                    locale
                });
            }

            // Check for duplicates
            if (seenLocales.has(locale)) {
                errors.push({
                    type: 'duplicate_locale',
                    message: `Duplicate locale found: "${locale}"`,
                    locale
                });
            }
            seenLocales.add(locale);
        }

        // Check if defaultLocale is included in locales array
        if (config.defaultLocale && !config.locales.includes(config.defaultLocale)) {
            errors.push({
                type: 'missing_default_locale',
                message: `defaultLocale "${config.defaultLocale}" must be included in the locales array`
            });
        }
    }

    // Validate fallbackLocale if provided
    if (config.fallbackLocale) {
        if (!isValidLocaleCode(config.fallbackLocale)) {
            errors.push({
                type: 'invalid_locale',
                message: `Invalid fallbackLocale: "${config.fallbackLocale}". Must be a valid ISO 639-1 language code`,
                locale: config.fallbackLocale
            });
        } else if (config.locales && !config.locales.includes(config.fallbackLocale)) {
            warnings.push(`fallbackLocale "${config.fallbackLocale}" is not in the locales array. It will be ignored.`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Normalizes and processes the i18n configuration
 * Returns a processed config with fallback values set
 */
function processI18nConfig(config: CapsuloConfig['i18n']): I18nConfig | null {
    if (!config) {
        return null;
    }

    const validation = validateI18nConfig(config);
    if (!validation.isValid) {
        throw new Error(`Invalid i18n configuration: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    return {
        defaultLocale: config.defaultLocale,
        locales: config.locales,
        fallbackLocale: config.fallbackLocale || config.defaultLocale
    };
}

/**
 * Gets the i18n configuration from the capsulo config with validation
 */
export function getI18nConfig(capsuloConfig: CapsuloConfig): I18nConfig | null {
    try {
        return processI18nConfig(capsuloConfig.i18n);
    } catch (error) {
        console.error('Translation system configuration error:', error);
        return null;
    }
}

/**
 * Checks if translation features are enabled
 */
export function isTranslationEnabled(capsuloConfig: CapsuloConfig): boolean {
    const i18nConfig = getI18nConfig(capsuloConfig);
    return i18nConfig !== null && i18nConfig.locales.length > 1;
}

