import type { QueuedFile, ImageOptimizationConfig } from './fileUpload.types';
import { UploadQueue } from './uploadQueue';
import { ImageOptimizer } from './imageOptimizer';
import { DEFAULT_IMAGE_OPTIMIZATION, parseUploadError, type FileUploadError } from './fileUpload.utils';
import { workerUploadService } from './workerUploadService';

/**
 * Result of batch processing operation
 */
export interface BatchProcessResult {
    success: boolean;
    uploadedFiles: Array<{
        url: string;
        name: string;
        size: number;
        type: string;
        originalSize?: number;
        optimized?: boolean;
    }>;
    errors: FileUploadError[];
    partialFailure: boolean;
}

/**
 * Upload manager class that orchestrates file operations
 */
export class UploadManager {
    private queue: UploadQueue;
    private imageOptimizer: ImageOptimizer;
    private isProcessing: boolean = false;

    constructor(
        queue?: UploadQueue,
        imageOptimizationConfig?: Partial<ImageOptimizationConfig>
    ) {
        this.queue = queue || new UploadQueue();
        this.imageOptimizer = new ImageOptimizer({
            ...DEFAULT_IMAGE_OPTIMIZATION,
            ...imageOptimizationConfig
        });
    }

    /**
     * Queue a file for upload with optional optimization
     */
    async queueUpload(file: File): Promise<string> {
        // Check if file should be optimized
        const shouldOptimize = await this.imageOptimizer.wouldBenefitFromOptimization(file);

        if (shouldOptimize) {
            // Optimize the file first
            const result = await this.imageOptimizer.optimizeImage(file);
            const optimizedFile = result.optimizedFile || file;

            return this.queue.queueUpload(optimizedFile);
        } else {
            return this.queue.queueUpload(file);
        }
    }

    /**
     * Queue a file URL for deletion
     */
    queueDeletion(url: string): string {
        return this.queue.queueDeletion(url);
    }

    /**
     * Remove an operation from the queue
     */
    removeOperation(id: string): boolean {
        return this.queue.removeOperation(id);
    }

    /**
     * Get current queue status
     */
    getQueueStatus() {
        return {
            stats: this.queue.getStats(),
            operations: this.queue.getAllOperations(),
            isProcessing: this.isProcessing,
            hasPendingOperations: this.queue.hasPendingOperations()
        };
    }

    /**
     * Process all queued operations and return final file URLs
     */
    async processQueue(): Promise<BatchProcessResult> {
        if (this.isProcessing) {
            throw new Error('Upload manager is already processing operations');
        }

        this.isProcessing = true;

        try {
            if (!workerUploadService.isConfigured()) {
                throw new Error('Upload service not configured. Please check your worker URL.');
            }

            const pendingUploads = this.queue.getPendingUploads();
            const pendingDeletions = this.queue.getPendingDeletions();
            const totalOperations = pendingUploads.length + pendingDeletions.length;

            if (totalOperations === 0) {
                return {
                    success: true,
                    uploadedFiles: [],
                    errors: [],
                    partialFailure: false
                };
            }

            const errors: FileUploadError[] = [];
            const uploadedFiles: BatchProcessResult['uploadedFiles'] = [];
            let completed = 0;



            // Process deletions first to free up space
            for (const deletion of pendingDeletions) {
                try {
                    this.queue.updateOperationStatus(deletion.id, 'processing');

                    // Delete the file using the worker service
                    if (deletion.url) {
                        await workerUploadService.deleteFile(deletion.url);
                        this.queue.updateOperationStatus(deletion.id, 'completed');
                    } else {
                        throw new Error('Deletion operation missing URL');
                    }
                } catch (error) {
                    const parsedError = parseUploadError(error, deletion.url || 'unknown');
                    errors.push(parsedError);
                    this.queue.updateOperationStatus(deletion.id, 'error', parsedError.message);
                }

                completed++;
            }

            // Process uploads
            for (const upload of pendingUploads) {
                if (!upload.file) {
                    errors.push({ message: `Upload operation ${upload.id} missing file` });
                    completed++;
                    continue;
                }

                const fileName = upload.file.name;

                try {
                    this.queue.updateOperationStatus(upload.id, 'processing');

                    // Simple upload without progress tracking
                    const url = await workerUploadService.uploadFileComplete(upload.file!);

                    // Mark as completed
                    this.queue.updateOperationStatus(upload.id, 'completed');

                    uploadedFiles.push({
                        url,
                        name: upload.file.name,
                        size: upload.file.size,
                        type: upload.file.type
                    });

                } catch (error) {
                    const parsedError = parseUploadError(error, fileName);
                    errors.push(parsedError);
                    this.queue.updateOperationStatus(upload.id, 'error', parsedError.message);
                }

                completed++;
            }

            const success = errors.length === 0;
            const partialFailure = errors.length > 0 && uploadedFiles.length > 0;

            return {
                success,
                uploadedFiles,
                errors,
                partialFailure
            };

        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Clear completed operations from the queue
     */
    clearCompleted(): void {
        this.queue.clearCompleted();
    }

    /**
     * Clear all operations from the queue
     */
    clearQueue(): void {
        this.queue.clear();
    }



    /**
     * Update image optimization configuration
     */
    updateImageOptimizationConfig(config: Partial<ImageOptimizationConfig>): void {
        this.imageOptimizer.updateConfig(config);
    }

    /**
     * Check if upload service is properly configured
     */
    isR2Configured(): boolean {
        return workerUploadService.isConfigured();
    }

    /**
     * Get upload service configuration status
     */
    getR2ConfigStatus() {
        return workerUploadService.getConfigStatus();
    }

    /**
     * Validate that the manager is ready for operations
     */
    validateReadiness(): { ready: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.isR2Configured()) {
            const configStatus = this.getR2ConfigStatus();
            const errorMessage = configStatus.errors.length > 0
                ? `R2 not configured: ${configStatus.errors.join('; ')}`
                : 'R2 not configured';
            errors.push(errorMessage);
        }

        if (this.isProcessing) {
            errors.push('Upload manager is currently processing operations');
        }

        return {
            ready: errors.length === 0,
            errors
        };
    }

    /**
     * Add a listener for queue changes
     */
    addQueueListener(listener: () => void): () => void {
        return this.queue.addListener(listener);
    }

    /**
     * Get queued files in the legacy format for compatibility
     */
    getQueuedFiles(): QueuedFile[] {
        return this.queue.getQueuedFiles();
    }
}

/**
 * Global upload manager instance
 */
export const globalUploadManager = new UploadManager();

/**
 * Hook for React components to use the upload manager
 */
export function useUploadManager(): UploadManager {
    return globalUploadManager;
}