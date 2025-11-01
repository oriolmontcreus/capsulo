/**
 * Storage Configuration Module
 * 
 * Exports all storage-related configuration utilities for R2 and image optimization
 */

export {
    type R2Config,
    type ImageOptimizationConfig,
    type StorageConfig,
    loadR2Config,
    loadImageOptimizationConfig,
    loadStorageConfig,
    validateR2Config,
    validateImageOptimizationConfig,
    isR2Available,
    getConfigurationStatus,
} from './config';

export {
    validateStorageConfiguration,
    logConfigurationStatus,
    getConfigurationHelp,
    getDetailedConfigurationStatus,
} from './validation';

export {
    DEFAULT_IMAGE_OPTIMIZATION,
    EXAMPLE_R2_CONFIG,
    EXAMPLE_STORAGE_CONFIG,
    ENV_TEMPLATE,
    CONFIG_TEMPLATE,
    QUALITY_PRESETS,
    DIMENSION_PRESETS,
    getConfigWithDefaults,
    applyQualityPreset,
    applyDimensionPreset,
    generateConfigurationGuide,
} from './defaults';