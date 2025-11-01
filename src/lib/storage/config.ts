/**
 * Storage Configuration Utilities
 * 
 * Handles loading R2 and image optimization configuration from environment variables
 * with fallback to capsulo.config.ts settings.
 */

import config from '../../../capsulo.config';

export interface R2Config {
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    endpoint?: string;
}

export interface ImageOptimizationConfig {
    enableWebPConversion: boolean;
    quality: number; // 0-100
    maxWidth?: number;
    maxHeight?: number;
    supportedFormats: string[];
}

export interface StorageConfig {
    r2?: R2Config;
    imageOptimization?: ImageOptimizationConfig;
}

/**
 * Load upload worker configuration
 */
export function loadUploadWorkerConfig(): { workerUrl: string } | null {
    // Check for upload worker URL in environment or config
    const workerUrl = import.meta.env.PUBLIC_UPLOAD_WORKER_URL || config.storage?.uploadWorkerUrl;

    if (!workerUrl) {
        return null;
    }

    return { workerUrl };
}

/**
 * Load R2 configuration - DISABLED for security
 * R2 credentials should never be exposed to the client side.
 * All uploads go through the secure worker instead.
 */
export function loadR2Config(): R2Config | null {
    // Direct R2 access from client is disabled for security reasons
    // All uploads are handled securely by the Cloudflare Worker
    return null;
}

/**
 * Load image optimization configuration with fallback to config file
 */
export function loadImageOptimizationConfig(): ImageOptimizationConfig {
    // Default configuration
    const defaults: ImageOptimizationConfig = {
        enableWebPConversion: true,
        quality: 85,
        maxWidth: 1920,
        maxHeight: 1080,
        supportedFormats: ['image/jpeg', 'image/png'],
    };

    // Use config file settings if available
    const configImageOpt = config.storage?.imageOptimization;
    if (configImageOpt) {
        return {
            enableWebPConversion: configImageOpt.enableWebPConversion ?? defaults.enableWebPConversion,
            quality: configImageOpt.quality ?? defaults.quality,
            maxWidth: configImageOpt.maxWidth ?? defaults.maxWidth,
            maxHeight: configImageOpt.maxHeight ?? defaults.maxHeight,
            supportedFormats: configImageOpt.supportedFormats ?? defaults.supportedFormats,
        };
    }

    return defaults;
}

/**
 * Load complete storage configuration
 */
export function loadStorageConfig(): StorageConfig {
    return {
        r2: loadR2Config() || undefined,
        imageOptimization: loadImageOptimizationConfig(),
    };
}

/**
 * Validate R2 credentials and configuration
 */
export function validateR2Config(r2Config: R2Config | null): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!r2Config) {
        errors.push('R2 configuration is missing. Please set environment variables or configure in capsulo.config.ts');
        return { isValid: false, errors };
    }

    if (!r2Config.bucket) {
        errors.push('R2 bucket name is required');
    }

    if (!r2Config.accessKeyId) {
        errors.push('R2 access key ID is required');
    }

    if (!r2Config.secretAccessKey) {
        errors.push('R2 secret access key is required');
    }

    if (!r2Config.region) {
        errors.push('R2 region is required');
    }

    // Validate bucket name format (basic validation)
    if (r2Config.bucket && !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(r2Config.bucket)) {
        errors.push('R2 bucket name must contain only lowercase letters, numbers, and hyphens');
    }

    // Validate region format
    if (r2Config.region && r2Config.region !== 'auto' && !/^[a-z0-9-]+$/.test(r2Config.region)) {
        errors.push('R2 region must be "auto" or a valid region identifier');
    }

    return { isValid: errors.length === 0, errors };
}

/**
 * Validate image optimization configuration
 */
export function validateImageOptimizationConfig(config: ImageOptimizationConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.quality < 0 || config.quality > 100) {
        errors.push('Image quality must be between 0 and 100');
    }

    if (config.maxWidth && config.maxWidth <= 0) {
        errors.push('Maximum width must be a positive number');
    }

    if (config.maxHeight && config.maxHeight <= 0) {
        errors.push('Maximum height must be a positive number');
    }

    if (!Array.isArray(config.supportedFormats) || config.supportedFormats.length === 0) {
        errors.push('Supported formats must be a non-empty array');
    }

    // Validate MIME types
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    for (const format of config.supportedFormats) {
        if (!validMimeTypes.includes(format)) {
            errors.push(`Unsupported image format: ${format}`);
        }
    }

    return { isValid: errors.length === 0, errors };
}

/**
 * Check if R2 upload functionality is available
 */
export function isR2Available(): boolean {
    const r2Config = loadR2Config();
    const validation = validateR2Config(r2Config);
    return validation.isValid;
}

/**
 * Get configuration status and any issues
 */
export function getConfigurationStatus(): {
    r2: { available: boolean; errors: string[] };
    imageOptimization: { available: boolean; errors: string[] };
} {
    const r2Config = loadR2Config();
    const r2Validation = validateR2Config(r2Config);

    const imageOptConfig = loadImageOptimizationConfig();
    const imageOptValidation = validateImageOptimizationConfig(imageOptConfig);

    return {
        r2: {
            available: r2Validation.isValid,
            errors: r2Validation.errors,
        },
        imageOptimization: {
            available: imageOptValidation.isValid,
            errors: imageOptValidation.errors,
        },
    };
}