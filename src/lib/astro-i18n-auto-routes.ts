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
                if (!config.i18n) return;
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
