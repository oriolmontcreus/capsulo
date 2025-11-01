import type { FileUploadValue, QueuedFile, ImageOptimizationConfig } from './fileUpload.types';
import { UploadQueue, type QueuedOperation } from './uploadQueue';
import { ImageOptimizer, type OptimizationProgressCallback } from './imageOptimizer';
import { DEFAULT_IMAGE_OPTIMIZATION, parseUploadError, retryOperation, type FileUploadError } from './fileUpload.utils';
import { workerUploadService } from './workerUploadService';

/**
 * Progress information for batch operations
 */
export interface BatchProgress {
    total: number;
    completed: number;
    failed: number;
    currentOperation: string;
    progress: number; // 0-100
    errors: FileUploadError[];
}

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
 * Progress callback for batch operations
 */
export type BatchProgressCallback = (progress: BatchProgress) => void;

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
            const originalFile = result.success ? file : undefined;

            return this.queue.queueUpload(optimizedFile, originalFile);
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
    async processQueue(onProgress?: BatchProgressCallback): Promise<BatchProcessResult> {
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

            // Progress callback helper
            const updateProgress = (currentOperation: string) => {
                onProgress?.({
                    total: totalOperations,
                    completed,
                    failed: errors.length,
                    currentOperation,
                    progress: Math.round((completed / totalOperations) * 100),
                    errors: [...errors]
                });
            };

            // Process deletions first to free up space
            for (const deletion of pendingDeletions) {
                updateProgress(`Deleting ${deletion.url}`);

                try {
                    this.queue.updateOperationStatus(deletion.id, 'processing');

                    // For now, skip deletions as we need to implement deletion endpoint in worker
                    // TODO: Add deletion support to worker
                    console.warn(`File deletion not yet implemented for worker-based uploads: ${deletion.url}`);
                    this.queue.updateOperationStatus(deletion.id, 'completed');
                } catch (error) {
                    const parsedError = parseUploadError(error, deletion.url);
                    errors.push(parsedError);
                    this.queue.updateOperationStatus(deletion.id, 'error', parsedError.message);
                }

                completed++;
                updateProgress(`Deleted ${deletion.url}`);
            }

            // Process uploads
            for (const upload of pendingUploads) {
                if (!upload.file) {
                    errors.push({ message: `Upload operation ${upload.id} missing file` });
                    completed++;
                    continue;
                }

                const fileName = upload.file.name;
                updateProgress(`Uploading ${fileName}`);

                try {
                    this.queue.updateOperationStatus(upload.id, 'processing');

                    // Use retry mechanism for upload via worker
                    const url = await retryOperation(
                        () => workerUploadService.uploadFileComplete(upload.file!),
                        3
                    );

                    uploadedFiles.push({
                        url,
                        name: upload.file.name,
                        size: upload.file.size,
                        type: upload.file.type,
                        originalSize: upload.originalFile?.size,
                        optimized: upload.optimized
                    });

                    this.queue.updateOperationStatus(upload.id, 'completed');
                } catch (error) {
                    const parsedError = parseUploadError(error, fileName);
                    errors.push(parsedError);
                    this.queue.updateOperationStatus(upload.id, 'error', parsedError.message);
                }

                completed++;
                updateProgress(`Uploaded ${fileName}`);
            }

            // Final progress update
            updateProgress('Processing complete');

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