/**
 * Configuration type definitions for Capsulo CMS
 * 
 * Note: The type is also defined inline in capsulo.config.ts for better portability.
 * This file is kept for reference and potential future use.
 */

export interface CapsuloConfig {
    /**
     * GitHub Configuration
     */
    github: {
        /**
         * The GitHub repository owner (username or organization)
         */
        owner: string;

        /**
         * The GitHub repository name
         */
        repo: string;
    };

    /**
     * Application Information
     */
    app: {
        /**
         * Application name displayed in the CMS
         */
        name: string;

        /**
         * Application version
         */
        version: string;

        /**
         * Cloudflare Worker URL for authentication
         */
        authWorkerUrl: string;
    };

    /**
     * CMS Features Configuration
     */
    features: {
        /**
         * Enable or disable the "Add Component" feature
         */
        enableAddComponent: boolean;
    };

    /**
     * CMS UI Configuration
     */
    ui: {
        /**
         * Page Filter Regex - Controls which pages show in the CMS file tree
         */
        pageFilterRegex: string;

        /**
         * Default Content Max Width - Controls the default maximum width of the content area
         */
        contentMaxWidth: string;
    };

    /**
     * Internationalization (i18n) Configuration
     * Configure multi-language support for your content
     */
    i18n?: {
        /**
         * Default locale for your content
         */
        defaultLocale: string;

        /**
         * Available locales for translation
         */
        locales: string[];

        /**
         * Fallback locale when a translation is missing
         */
        fallbackLocale?: string;
    };
}