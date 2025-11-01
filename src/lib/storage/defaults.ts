/**
 * Configuration Defaults and Examples
 * 
 * Provides default values and example configurations for R2 and image optimization
 */

import type { R2Config, ImageOptimizationConfig, StorageConfig } from './config';

/**
 * Default image optimization configuration
 */
export const DEFAULT_IMAGE_OPTIMIZATION: ImageOptimizationConfig = {
    enableWebPConversion: true,
    quality: 85,
    maxWidth: 1920,
    maxHeight: 1080,
    supportedFormats: ['image/jpeg', 'image/png'],
};

/**
 * Example R2 configuration (with placeholder values)
 */
export const EXAMPLE_R2_CONFIG: R2Config = {
    bucket: 'my-cms-bucket',
    accessKeyId: 'your-access-key-id',
    secretAccessKey: 'your-secret-access-key',
    region: 'auto',
    endpoint: 'https://your-account-id.r2.cloudflarestorage.com',
};

/**
 * Example complete storage configuration
 */
export const EXAMPLE_STORAGE_CONFIG: StorageConfig = {
    r2: EXAMPLE_R2_CONFIG,
    imageOptimization: DEFAULT_IMAGE_OPTIMIZATION,
};

/**
 * Environment variable template
 */
export const ENV_TEMPLATE = `# Cloudflare R2 Configuration
CLOUDFLARE_R2_BUCKET=my-cms-bucket
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key-id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-access-key
CLOUDFLARE_R2_REGION=auto
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com`;

/**
 * Capsulo config template for storage section
 */
export const CONFIG_TEMPLATE = `storage: {
    r2: {
        bucket: "my-cms-bucket",
        accessKeyId: "your-access-key-id",
        secretAccessKey: "your-secret-access-key",
        region: "auto",
        endpoint: "https://your-account-id.r2.cloudflarestorage.com",
    },
    imageOptimization: {
        enableWebPConversion: true,
        quality: 85,
        maxWidth: 1920,
        maxHeight: 1080,
        supportedFormats: ['image/jpeg', 'image/png'],
    },
}`;

/**
 * Quality presets for different use cases
 */
export const QUALITY_PRESETS = {
    maximum: { quality: 95, description: 'Maximum quality, larger file sizes' },
    high: { quality: 85, description: 'High quality, balanced file sizes (recommended)' },
    medium: { quality: 75, description: 'Medium quality, smaller file sizes' },
    low: { quality: 60, description: 'Low quality, smallest file sizes' },
} as const;

/**
 * Dimension presets for different use cases
 */
export const DIMENSION_PRESETS = {
    '4k': { maxWidth: 3840, maxHeight: 2160, description: '4K resolution' },
    '2k': { maxWidth: 2560, maxHeight: 1440, description: '2K resolution' },
    'fullhd': { maxWidth: 1920, maxHeight: 1080, description: 'Full HD (recommended)' },
    'hd': { maxWidth: 1280, maxHeight: 720, description: 'HD resolution' },
    'web': { maxWidth: 1024, maxHeight: 768, description: 'Web optimized' },
} as const;

/**
 * Get configuration with applied defaults
 */
export function getConfigWithDefaults(config?: Partial<StorageConfig>): StorageConfig {
    return {
        r2: config?.r2 || undefined,
        imageOptimization: {
            ...DEFAULT_IMAGE_OPTIMIZATION,
            ...config?.imageOptimization,
        },
    };
}

/**
 * Validate and apply quality preset
 */
export function applyQualityPreset(preset: keyof typeof QUALITY_PRESETS): number {
    return QUALITY_PRESETS[preset].quality;
}

/**
 * Validate and apply dimension preset
 */
export function applyDimensionPreset(preset: keyof typeof DIMENSION_PRESETS): { maxWidth: number; maxHeight: number } {
    const { maxWidth, maxHeight } = DIMENSION_PRESETS[preset];
    return { maxWidth, maxHeight };
}

/**
 * Generate configuration help text
 */
export function generateConfigurationGuide(): string {
    return `
# File Upload Configuration Guide

## Quick Setup (Recommended)

1. Set environment variables in your .env file:
${ENV_TEMPLATE}

2. Or configure in capsulo.config.ts:
${CONFIG_TEMPLATE}

## Quality Presets

${Object.entries(QUALITY_PRESETS).map(([key, preset]) =>
        `- ${key}: ${preset.quality}% - ${preset.description}`
    ).join('\n')}

## Dimension Presets

${Object.entries(DIMENSION_PRESETS).map(([key, preset]) =>
        `- ${key}: ${preset.maxWidth}x${preset.maxHeight} - ${preset.description}`
    ).join('\n')}

## Getting R2 Credentials

1. Log in to Cloudflare Dashboard
2. Go to R2 Object Storage
3. Create a bucket or use existing one
4. Go to "Manage R2 API tokens"
5. Create a new API token with read/write permissions
6. Copy the credentials to your environment variables

## Testing Configuration

Use the configuration validation utilities to test your setup:

\`\`\`typescript
import { validateStorageConfiguration, logConfigurationStatus } from '@/lib/storage';

// Check configuration status
logConfigurationStatus();

// Get detailed validation
const status = validateStorageConfiguration();
console.log(status);
\`\`\`
`;
}