import { capsuloConfig } from './config';

/**
 * Available locales from capsulo config
 */
export const LOCALES = capsuloConfig.i18n?.locales || ['en'];
export type Locale = string;

/**
 * Default locale from capsulo config
 */
export const DEFAULT_LOCALE = capsuloConfig.i18n?.defaultLocale || 'en';

/**
 * Check if a locale is valid
 * @param locale - The locale to check
 * @returns Whether the locale is valid
 */
export function isValidLocale(locale: string): locale is Locale {
    return LOCALES.includes(locale);
}

/**
 * Check if a value is a translation object (has locale keys)
 * @param value - The value to check
 * @returns Whether the value is a translation object
 */
export const isTranslationObject = (value: any): value is Record<string, any> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const keys = Object.keys(value);
    return keys.length > 0 && keys.some(key => LOCALES.includes(key));
};

/**
 * Get the locale from a URL pathname
 * @param pathname - The URL pathname
 * @returns The detected locale or default locale
 */
export function getLocaleFromPathname(pathname: string): Locale {
    const segments = pathname.split('/').filter(Boolean);
    const firstSegment = segments[0];

    if (firstSegment && isValidLocale(firstSegment)) return firstSegment;

    return DEFAULT_LOCALE;
}