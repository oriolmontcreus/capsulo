/// <reference types="astro/client" />

interface ImportMetaEnv {
    // GitHub Configuration
    readonly GITHUB_REPO_OWNER?: string;
    readonly GITHUB_REPO_NAME?: string;

    // Public Application Configuration
    readonly PUBLIC_APP_NAME?: string;
    readonly PUBLIC_APP_VERSION?: string;
    readonly PUBLIC_AUTH_WORKER_URL?: string;

    // Feature Flags
    readonly PUBLIC_ENABLE_ADD_COMPONENT?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}