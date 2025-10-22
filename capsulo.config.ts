/**
 * Capsulo CMS Configuration
 * 
 * This file contains all configuration options for your Capsulo CMS instance.
 * All settings have sensible defaults and can be customized as needed.
 */

interface CapsuloConfig {
    github: {
        owner: string;
        repo: string;
    };
    app: {
        name: string;
        version: string;
        authWorkerUrl: string;
    };
    features: {
        enableAddComponent: boolean;
    };
    ui: {
        pageFilterRegex: string;
    };
}

const config: CapsuloConfig = {
    /**
     * GitHub Configuration
     * Configure the GitHub repository used for authentication and content storage
     */
    github: {
        /**
         * The GitHub repository owner (username or organization)
         * @example "your-github-username"
         */
        owner: "oriolmontcreus",

        /**
         * The GitHub repository name
         * @example "your-repo-name"
         */
        repo: "capsulo",
    },

    /**
     * Application Information
     * Configure your application's basic metadata
     */
    app: {
        /**
         * Application name displayed in the CMS
         * @default "Capsulo CMS"
         */
        name: "Capsulo CMS",

        /**
         * Application version
         * @default "1.0.0"
         */
        version: "1.0.0",

        /**
         * Cloudflare Worker URL for authentication
         * 
         * Development: http://localhost:8787
         * Production: https://your-auth-worker.your-subdomain.workers.dev
         * 
         * @example "https://your-auth-worker.your-subdomain.workers.dev"
         */
        authWorkerUrl: "https://your-auth-worker.your-subdomain.workers.dev",
    },

    /**
     * CMS Features Configuration
     * Control which features are enabled in the CMS
     */
    features: {
        /**
         * Enable or disable the "Add Component" feature
         * 
         * Set to false to hide the feature from clients who shouldn't add new components.
         * Useful when delivering the website to clients.
         * 
         * @default true
         */
        enableAddComponent: true,
    },

    /**
     * CMS UI Configuration
     * Customize the CMS user interface behavior
     */
    ui: {
        /**
         * Page Filter Regex - Controls which pages show in the CMS file tree
         * 
         * This regex is used to filter which pages appear in the CMS sidebar.
         * By default, it excludes the /admin folder.
         * 
         * Examples:
         * - Exclude admin: "^(?!.*\\/admin\\/).*$"
         * - Include only specific folders: "^(blog|docs)\\/.*$"
         * - Exclude multiple patterns: "^(?!.*(\\/admin\\/|\\/private\\/|\\/draft\\/)).*$"
         * 
         * @default "^(?!.*\\/admin\\/).*$"
         */
        pageFilterRegex: "^(?!.*\\/admin\\/).*$",
    },
};

export default config;
