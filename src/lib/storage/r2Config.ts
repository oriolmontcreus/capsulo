/**
 * R2 URL configuration and validation
 * Provides centralized logic for identifying R2 URLs based on environment configuration
 */

import { loadUploadWorkerConfig } from './index';

export interface R2UrlConfig {
    /**
     * Known R2 hostnames that should be considered R2 URLs
     */
    allowedHostnames: string[];

    /**
     * Path prefix for CMS uploads (e.g., 'cms-uploads/')
     */
    uploadPathPrefix: string;

    /**
     * Worker URL (if configured)
     */
    workerUrl: string | null;
}

// Module-level cached config
let cachedConfig: R2UrlConfig | null = null;

/**
 * Get R2 URL configuration (cached)
 * Returns the cached configuration if available, otherwise loads and caches it
 */
function getR2UrlConfig(): R2UrlConfig {
    if (!cachedConfig) {
        cachedConfig = loadR2UrlConfig();
    }
    return cachedConfig;
}

/**
 * Load R2 URL configuration from environment and config
 */
export function loadR2UrlConfig(): R2UrlConfig {
    const workerConfig = loadUploadWorkerConfig();

    // Get allowed R2 hostnames from environment or use defaults
    const envHostnames = import.meta.env.PUBLIC_R2_ALLOWED_HOSTNAMES;
    const allowedHostnames: string[] = [];

    // Parse environment variable (comma-separated list)
    if (typeof envHostnames === 'string' && envHostnames.length > 0) {
        allowedHostnames.push(...envHostnames.split(',').map(h => h.trim()).filter(h => h.length > 0));
    }

    // Add default R2 patterns if not already included
    const defaultPatterns = [
        '.r2.cloudflarestorage.com',
        '.r2.dev'
    ];

    defaultPatterns.forEach(pattern => {
        if (!allowedHostnames.some(h => h.includes(pattern))) {
            allowedHostnames.push(pattern);
        }
    });

    // Get upload path prefix from environment or use default
    const uploadPathPrefix = import.meta.env.PUBLIC_R2_UPLOAD_PATH_PREFIX || 'cms-uploads/';

    return {
        allowedHostnames,
        uploadPathPrefix,
        workerUrl: workerConfig?.workerUrl || null
    };
}

/**
 * Check if a URL is an R2 bucket URL
 * Uses strict validation based on hostname and path patterns
 * 
 * @param url - The URL to check
 * @returns true if the URL is an R2 URL that should be managed (uploaded/deleted)
 */
export function isR2Url(url: string): boolean {

    if (url.startsWith('data:')) return false;
    if (url.startsWith('blob:')) return false;

    try {
        const urlObj = new URL(url);
        const config = getR2UrlConfig();

        // Check if hostname matches any allowed R2 hostname pattern
        const hostnameMatches = config.allowedHostnames.some(pattern => {
            // Pattern can be:
            // 1. A suffix pattern like '.r2.dev' or '.r2.cloudflarestorage.com'
            // 2. An exact hostname like 'pub-xxx.r2.dev'
            if (pattern.startsWith('.')) {
                // Suffix pattern
                return urlObj.hostname.endsWith(pattern);
            } else {
                // Exact hostname match
                return urlObj.hostname === pattern;
            }
        });

        if (hostnameMatches) {
            return true;
        }

        // Check if it's a worker URL with the upload path prefix
        if (config.workerUrl) {
            try {
                const workerUrlObj = new URL(config.workerUrl);
                if (urlObj.hostname === workerUrlObj.hostname) {
                    // Check if path contains the upload prefix
                    const pathWithoutLeadingSlash = urlObj.pathname.startsWith('/')
                        ? urlObj.pathname.substring(1)
                        : urlObj.pathname;

                    return pathWithoutLeadingSlash.startsWith(config.uploadPathPrefix);
                }
            } catch {
                // Invalid worker URL, skip this check
            }
        }

        // Check for /r2/ path pattern (legacy support)
        if (urlObj.pathname.includes('/r2/')) {
            return true;
        }

        return false;
    } catch (error) {
        // If URL parsing fails, fall back to legacy string-based checks
        // This handles edge cases where the URL might be malformed but still identifiable
        return url.includes('.r2.cloudflarestorage.com') ||
            url.includes('.r2.dev') ||
            url.includes('/r2/');
    }
}
