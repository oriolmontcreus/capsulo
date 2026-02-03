/**
 * Simple storage configuration for upload worker
 */

// Export R2 configuration and validation
export { loadR2UrlConfig, isR2Url, type R2UrlConfig } from './r2Config';

// Export upload worker configuration from isolated module
export { loadUploadWorkerConfig } from '../config/uploadWorkerConfig';