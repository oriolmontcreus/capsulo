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
            shouldResize = Boolean(
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
    async optimizeImage(file: File): Promise<OptimizationResult> {
        const originalSize = file.size;

        try {
            const strategy = await this.detectOptimizationStrategy(file);

            if (!strategy.shouldOptimize) {
                return {
                    success: true,
                    optimizedFile: file,
                    originalSize,
                    optimizedSize: originalSize,
                    compressionRatio: 0
                };
            }

            let processedFile = file;

            // Resize if needed
            if (strategy.shouldResize) {
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

            // WebP conversion if needed
            if (strategy.shouldConvertToWebP) {
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

            const optimizedSize = processedFile.size;
            const compressionRatio = calculateCompressionRatio(originalSize, optimizedSize);

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

