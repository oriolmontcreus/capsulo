/**
 * Shared utility for generating getStaticPaths for locale-based routes
 * 
 * This is used by the auto-static-paths integration, but can also be imported manually if needed.
 */

import { LOCALES } from './i18n-utils';

/**
 * Generates static paths for all configured locales
 * Use this in any page under [locale] directory
 */
export function getLocaleStaticPaths() {
    return LOCALES.map((locale) => ({
        params: { locale },
    }));
}
