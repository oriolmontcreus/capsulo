/**
 * Simple storage configuration for upload worker
 */

import config from '../../../capsulo.config';

/**
 * Load upload worker configuration
 */
export function loadUploadWorkerConfig(): { workerUrl: string } | null {
    const workerUrl = import.meta.env.PUBLIC_UPLOAD_WORKER_URL || (config as any).storage?.uploadWorkerUrl;
    return workerUrl ? { workerUrl } : null;
}