/**
 * Storage Configuration Validation Utilities
 * 
 * Provides utilities for validating storage configuration and credentials
 */

import { loadR2Config, loadImageOptimizationConfig, validateR2Config, validateImageOptimizationConfig } from './config';

/**
 * Comprehensive validation of all storage configuration
 */
export function validateStorageConfiguration(): {
    isValid: boolean;
    r2: { available: boolean; errors: string[] };
    imageOptimization: { available: boolean; errors: string[] };
    summary: string;
} {
    const r2Config = loadR2Config();
    const r2Validation = validateR2Config(r2Config);

    const imageOptConfig = loadImageOptimizationConfig();
    const imageOptValidation = validateImageOptimizationConfig(imageOptConfig);

    const isValid = r2Validation.isValid && imageOptValidation.isValid;

    let summary = '';
    if (isValid) {
        summary = 'Storage configuration is valid and ready for use';
    } else {
        const issues = [];
        if (!r2Validation.isValid) {
            issues.push(`R2: ${r2Validation.errors.join(', ')}`);
        }
        if (!imageOptValidation.isValid) {
            issues.push(`Image Optimization: ${imageOptValidation.errors.join(', ')}`);
        }
        summary = `Configuration issues found: ${issues.join('; ')}`;
    }

    return {
        isValid,
        r2: {
            available: r2Validation.isValid,
            errors: r2Validation.errors,
        },
        imageOptimization: {
            available: imageOptValidation.isValid,
            errors: imageOptValidation.errors,
        },
        summary,
    };
}

/**
 * Log configuration status to console (useful for debugging)
 */
export function logConfigurationStatus(): void {
    const status = validateStorageConfiguration();

    console.log('=== Storage Configuration Status ===');
    console.log(`Overall Status: ${status.isValid ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`Summary: ${status.summary}`);

    console.log('\nR2 Configuration:');
    console.log(`  Status: ${status.r2.available ? '✅ Available' : '❌ Not Available'}`);
    if (status.r2.errors.length > 0) {
        status.r2.errors.forEach(error => console.log(`  ❌ ${error}`));
    }

    console.log('\nImage Optimization Configuration:');
    console.log(`  Status: ${status.imageOptimization.available ? '✅ Available' : '❌ Not Available'}`);
    if (status.imageOptimization.errors.length > 0) {
        status.imageOptimization.errors.forEach(error => console.log(`  ❌ ${error}`));
    }

    console.log('=====================================');
}

/**
 * Get user-friendly configuration help messages
 */
export function getConfigurationHelp(): {
    r2Setup: string[];
    imageOptimizationSetup: string[];
    environmentVariables: string[];
    troubleshooting: string[];
} {
    return {
        r2Setup: [
            'To set up R2 storage, you need:',
            '1. A Cloudflare R2 bucket',
            '2. R2 API credentials (Access Key ID and Secret Access Key)',
            '3. The bucket region (usually "auto" for R2)',
            '4. Optional: Custom endpoint URL',
        ],
        imageOptimizationSetup: [
            'Image optimization settings:',
            '1. enableWebPConversion: Convert JPEG/PNG to WebP (recommended: true)',
            '2. quality: Compression quality 0-100 (recommended: 85)',
            '3. maxWidth/maxHeight: Maximum dimensions in pixels (recommended: 1920x1080)',
            '4. supportedFormats: Array of MIME types to optimize',
        ],
        environmentVariables: [
            'Environment variables (recommended approach):',
            'CLOUDFLARE_R2_BUCKET=your-bucket-name',
            'CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key',
            'CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-key',
            'CLOUDFLARE_R2_REGION=auto',
            'CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com',
        ],
        troubleshooting: [
            'Common issues and solutions:',
            '• Missing credentials: Check environment variables are set correctly',
            '• Invalid bucket name: Must contain only lowercase letters, numbers, and hyphens',
            '• Connection errors: Verify endpoint URL and region settings',
            '• Permission errors: Ensure R2 API token has read/write permissions',
            '• CORS issues: Configure bucket CORS settings for browser uploads',
        ],
    };
}

/**
 * Get detailed configuration validation with actionable error messages
 */
export function getDetailedConfigurationStatus(): {
    isValid: boolean;
    r2: {
        available: boolean;
        configured: boolean;
        source: 'environment' | 'config' | 'none';
        errors: Array<{ field: string; message: string; solution: string }>;
    };
    imageOptimization: {
        available: boolean;
        errors: Array<{ field: string; message: string; solution: string }>;
    };
    recommendations: string[];
} {
    const r2Config = loadR2Config();
    const r2Validation = validateR2Config(r2Config);

    const imageOptConfig = loadImageOptimizationConfig();
    const imageOptValidation = validateImageOptimizationConfig(imageOptConfig);

    // Determine R2 configuration source
    let r2Source: 'environment' | 'config' | 'none' = 'none';
    if (r2Config) {
        // Check if environment variables are set
        const hasEnvVars = !!(
            import.meta.env?.CLOUDFLARE_R2_BUCKET ||
            import.meta.env?.CLOUDFLARE_R2_ACCESS_KEY_ID ||
            import.meta.env?.CLOUDFLARE_R2_SECRET_ACCESS_KEY
        );
        r2Source = hasEnvVars ? 'environment' : 'config';
    }

    // Convert validation errors to detailed format
    const r2DetailedErrors = r2Validation.errors.map(error => {
        if (error.includes('bucket name')) {
            return {
                field: 'bucket',
                message: error,
                solution: 'Set CLOUDFLARE_R2_BUCKET environment variable or configure in capsulo.config.ts'
            };
        } else if (error.includes('access key')) {
            return {
                field: 'accessKeyId',
                message: error,
                solution: 'Set CLOUDFLARE_R2_ACCESS_KEY_ID environment variable with your R2 API token'
            };
        } else if (error.includes('secret')) {
            return {
                field: 'secretAccessKey',
                message: error,
                solution: 'Set CLOUDFLARE_R2_SECRET_ACCESS_KEY environment variable with your R2 API secret'
            };
        } else if (error.includes('region')) {
            return {
                field: 'region',
                message: error,
                solution: 'Set CLOUDFLARE_R2_REGION environment variable (usually "auto" for R2)'
            };
        } else {
            return {
                field: 'general',
                message: error,
                solution: 'Check your R2 configuration settings'
            };
        }
    });

    const imageOptDetailedErrors = imageOptValidation.errors.map(error => {
        if (error.includes('quality')) {
            return {
                field: 'quality',
                message: error,
                solution: 'Set quality between 0-100 in capsulo.config.ts (recommended: 85)'
            };
        } else if (error.includes('width')) {
            return {
                field: 'maxWidth',
                message: error,
                solution: 'Set maxWidth to a positive number in capsulo.config.ts (recommended: 1920)'
            };
        } else if (error.includes('height')) {
            return {
                field: 'maxHeight',
                message: error,
                solution: 'Set maxHeight to a positive number in capsulo.config.ts (recommended: 1080)'
            };
        } else if (error.includes('formats')) {
            return {
                field: 'supportedFormats',
                message: error,
                solution: 'Set supportedFormats to an array of valid MIME types like ["image/jpeg", "image/png"]'
            };
        } else {
            return {
                field: 'general',
                message: error,
                solution: 'Check your image optimization configuration settings'
            };
        }
    });

    // Generate recommendations
    const recommendations: string[] = [];
    if (!r2Validation.isValid) {
        recommendations.push('Configure R2 credentials to enable file uploads');
        if (r2Source === 'none') {
            recommendations.push('Use environment variables for secure credential storage');
        }
    }
    if (imageOptConfig.quality > 95) {
        recommendations.push('Consider lowering image quality to 85-90 for better file size optimization');
    }
    if (!imageOptConfig.enableWebPConversion) {
        recommendations.push('Enable WebP conversion to reduce image file sizes by 25-50%');
    }
    if ((imageOptConfig.maxWidth || 0) > 2560 || (imageOptConfig.maxHeight || 0) > 1440) {
        recommendations.push('Consider smaller maximum dimensions for better performance');
    }

    return {
        isValid: r2Validation.isValid && imageOptValidation.isValid,
        r2: {
            available: r2Validation.isValid,
            configured: r2Config !== null,
            source: r2Source,
            errors: r2DetailedErrors,
        },
        imageOptimization: {
            available: imageOptValidation.isValid,
            errors: imageOptDetailedErrors,
        },
        recommendations,
    };
}