/**
 * Astro Integration: Auto-generate locale routes for single page files
 * 
 * This integration automatically creates locale routes from a single index.astro file
 * when using prefixDefaultLocale: true, eliminating the need for locale directories.
 */

import type { AstroIntegration } from 'astro';
import { LOCALES } from './i18n-utils';

export function autoI18nRoutes(): AstroIntegration {
    return {
        name: 'auto-i18n-routes',
        hooks: {
            'astro:config:setup': ({ injectRoute, config }) => {
                // Only run if i18n is configured with prefixDefaultLocale: true
                if (!config.i18n || !config.i18n.routing?.prefixDefaultLocale) {
                    return;
                }

                // For each locale, inject a route that uses the root index.astro
                LOCALES.forEach((locale) => {
                    injectRoute({
                        pattern: `/${locale}`,
                        entrypoint: './src/pages/index.astro',
                    });
                });
            },
        },
    };
}

