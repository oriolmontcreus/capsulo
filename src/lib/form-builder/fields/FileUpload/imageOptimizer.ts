import type { ImageOptimizationConfig, QueuedFile } from './fileUpload.types';
import {
    DEFAULT_IMAGE_OPTIMIZATION,
    isOptimizableImage,
    convertToWebP,
    resizeImage,
    getImageDimensions,
    supportsWebP,
    calculateCompressionRatio
} from './fileUpload.utils';

/**
 * Optimization result interface
 */
export interface OptimizationResult {
    success: boolean;
    optimizedFile?: File;
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
    error?: string;
    fallbackUsed?: boolean;
}

/**
 * Progress callback for optimization operations
 */
export type OptimizationProgressCallback = (progress: {
    fileId: string;
    stage: 'detecting' | 'loading' | 'resizing' | 'converting' | 'complete' | 'error';
    progress: number; // 0-100
    message: string;
}) => void;

/**
 * Image optimization pipeline class
 */
export class ImageOptimizer {
    private config: ImageOptimizationConfig;
    private webpSupported: boolean | null = null;

    constructor(config: Partial<ImageOptimizationConfig> = {}) {
        this.config = { ...DEFAULT_IMAGE_OPTIMIZATION, ...config };
    }

    /**
     * Check if browser supports WebP format (cached result)
     */
    private async checkWebPSupport(): Promise<boolean> {
        if (this.webpSupported === null) {
            this.webpSupported = await supportsWebP();
        }
        return this.webpSupported;
    }

    /**
     * Detect image format and determine optimization strategy
     */
    private async detectOptimizationStrategy(file: File): Promise<{
        shouldOptimize: boolean;
        shouldConvertToWebP: boolean;
        shouldResize: boolean;
        reason: string;
    }> {
        // Check if file is an optimizable image
        if (!isOptimizableImage(file)) {
            return {
                shouldOptimize: false,
                shouldConvertToWebP: false,
                shouldResize: false,
                reason: 'File type not supported for optimization'
            };
        }

        // Check WebP support if conversion is enabled
        const webpSupported = this.config.enableWebPConversion ? await this.checkWebPSupport() : false;
        const shouldConvertToWebP = webpSupported && file.type !== 'image/webp';

        // Check if image needs resizing
        let shouldResize = false;
        try {
            const dimensions = await getImageDimensions(file);
            shouldResize = (
                (this.config.maxWidth && dimensions.width > this.config.maxWidth) ||
                (this.config.maxHeight && dimensions.height > this.config.maxHeight)
            );
        } catch (error) {
            console.warn('Failed to get image dimensions:', error);
        }

        const shouldOptimize = shouldConvertToWebP || shouldResize;

        return {
            shouldOptimize,
            shouldConvertToWebP,
            shouldResize,
            reason: shouldOptimize
                ? `Will ${shouldConvertToWebP ? 'convert to WebP' : ''}${shouldConvertToWebP && shouldResize ? ' and ' : ''}${shouldResize ? 'resize' : ''}`
                : 'No optimization needed'
        };
    }

    /**
     * Optimize a single image file
     */
    async optimizeImage(
        file: File,
        onProgress?: OptimizationProgressCallback,
        fileId?: string
    ): Promise<OptimizationResult> {
        const id = fileId || `opt_${Date.now()}`;
        const originalSize = file.size;

        try {
            // Stage 1: Detecting optimization strategy
            onProgress?.({
                fileId: id,
                stage: 'detecting',
                progress: 10,
                message: 'Analyzing image...'
            });

            const strategy = await this.detectOptimizationStrategy(file);

            if (!strategy.shouldOptimize) {
                onProgress?.({
                    fileId: id,
                    stage: 'complete',
                    progress: 100,
                    message: strategy.reason
                });

                return {
                    success: true,
                    optimizedFile: file,
                    originalSize,
                    optimizedSize: originalSize,
                    compressionRatio: 0
                };
            }

            // Stage 2: Loading image
            onProgress?.({
                fileId: id,
                stage: 'loading',
                progress: 25,
                message: 'Loading image data...'
            });

            let processedFile = file;

            // Stage 3: Resizing if needed
            if (strategy.shouldResize) {
                onProgress?.({
                    fileId: id,
                    stage: 'resizing',
                    progress: 50,
                    message: 'Resizing image...'
                });

                try {
                    processedFile = await resizeImage(
                        processedFile,
                        this.config.maxWidth,
                        this.config.maxHeight,
                        this.config.quality
                    );
                } catch (error) {
                    console.warn('Resizing failed, continuing with original:', error);
                }
            }

            // Stage 4: WebP conversion if needed
            if (strategy.shouldConvertToWebP) {
                onProgress?.({
                    fileId: id,
                    stage: 'converting',
                    progress: 75,
                    message: 'Converting to WebP...'
                });

                try {
                    const webpFile = await convertToWebP(processedFile, this.config);

                    // Only use WebP if it's actually smaller or same size
                    if (webpFile.size <= processedFile.size || webpFile.type === 'image/webp') {
                        processedFile = webpFile;
                    } else {
                        console.info('WebP conversion resulted in larger file, keeping original format');
                    }
                } catch (error) {
                    console.warn('WebP conversion failed, using fallback:', error);
                    // Continue with the resized file (fallback)
                }
            }

            // Stage 5: Complete
            const optimizedSize = processedFile.size;
            const compressionRatio = calculateCompressionRatio(originalSize, optimizedSize);

            onProgress?.({
                fileId: id,
                stage: 'complete',
                progress: 100,
                message: `Optimization complete (${compressionRatio}% reduction)`
            });

            return {
                success: true,
                optimizedFile: processedFile,
                originalSize,
                optimizedSize,
                compressionRatio,
                fallbackUsed: processedFile.type !== 'image/webp' && strategy.shouldConvertToWebP
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown optimization error';

            onProgress?.({
                fileId: id,
                stage: 'error',
                progress: 0,
                message: `Optimization failed: ${errorMessage}`
            });

            // Return original file as fallback
            return {
                success: false,
                optimizedFile: file,
                originalSize,
                optimizedSize: originalSize,
                compressionRatio: 0,
                error: errorMessage,
                fallbackUsed: true
            };
        }
    }



    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<ImageOptimizationConfig>): void {
        this.config = { ...this.config, ...newConfig };
        // Reset WebP support check if conversion setting changed
        if ('enableWebPConversion' in newConfig) {
            this.webpSupported = null;
        }
    }

    /**
     * Get current configuration
     */
    getConfig(): ImageOptimizationConfig {
        return { ...this.config };
    }

    /**
     * Check if a file would benefit from optimization
     */
    async wouldBenefitFromOptimization(file: File): Promise<boolean> {
        const strategy = await this.detectOptimizationStrategy(file);
        return strategy.shouldOptimize;
    }


}

/**
 * Default optimizer instance
 */
export const defaultImageOptimizer = new ImageOptimizer();

