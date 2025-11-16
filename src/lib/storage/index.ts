/**
 * Simple storage configuration for upload worker
 */

import config from '../../../capsulo.config';

/**
 * Type guard to check if config has storage with uploadWorkerUrl
 */
function hasUploadWorkerUrl(cfg: unknown): cfg is { storage: { uploadWorkerUrl: string } } {
    return (
        typeof cfg === 'object' &&
        cfg !== null &&
        'storage' in cfg &&
        typeof (cfg as any).storage === 'object' &&
        (cfg as any).storage !== null &&
        'uploadWorkerUrl' in (cfg as any).storage &&
        typeof (cfg as any).storage.uploadWorkerUrl === 'string'
    );
}

/**
 * Load upload worker configuration
 */
export function loadUploadWorkerConfig(): { workerUrl: string } | null {
    // Check environment variable first
    const envWorkerUrl = import.meta.env.PUBLIC_UPLOAD_WORKER_URL;
    if (typeof envWorkerUrl === 'string' && envWorkerUrl.length > 0) {
        return { workerUrl: envWorkerUrl };
    }

    // Check config with type safety
    if (hasUploadWorkerUrl(config)) {
        return { workerUrl: config.storage.uploadWorkerUrl };
    }

    return null;
}