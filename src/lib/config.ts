/**
 * Application configuration from environment variables
 * Provides type-safe access to environment variables with proper defaults
 */

export const config = {
    /**
     * GitHub configuration
     */
    github: {
        owner: import.meta.env.GITHUB_REPO_OWNER || "oriolmontcreus",
        repo: import.meta.env.GITHUB_REPO_NAME || "capsulo",
    },

    /**
     * Application information
     */
    app: {
        name: import.meta.env.PUBLIC_APP_NAME || "Capsulo CMS",
        version: import.meta.env.PUBLIC_APP_VERSION || "1.0.0",
        authWorkerUrl: import.meta.env.PUBLIC_AUTH_WORKER_URL,
    },

    /**
     * CMS Feature flags
     */
    features: {
        /**
         * Whether to show the "Add Component" feature in the CMS
         * Set PUBLIC_ENABLE_ADD_COMPONENT=false to hide it for client deliveries
         * @default true
         */
        enableAddComponent: import.meta.env.PUBLIC_ENABLE_ADD_COMPONENT !== 'false',
    },
} as const;

/**
 * Type-safe helper to check if a feature is enabled
 */
export const isFeatureEnabled = (feature: keyof typeof config.features): boolean => {
    return config.features[feature];
};