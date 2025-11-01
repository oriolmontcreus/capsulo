import type { QueuedFile } from './fileUpload.types';

/**
 * Represents a file operation in the queue
 */
export interface QueuedOperation {
    id: string;
    type: 'upload' | 'delete';
    status: 'pending' | 'processing' | 'completed' | 'error';
    error?: string;
    // For upload operations
    file?: File;
    originalFile?: File;
    preview?: string;
    optimized?: boolean;
    // For delete operations
    url?: string;
    // Timestamps
    createdAt: number;
    updatedAt: number;
}

/**
 * Upload queue manager for handling file operations
 */
export class UploadQueue {
    private operations: Map<string, QueuedOperation> = new Map();
    private listeners: Set<() => void> = new Set();

    /**
     * Add a file to the upload queue
     */
    queueUpload(file: File, originalFile?: File): string {
        const id = this.generateId();
        const operation: QueuedOperation = {
            id,
            type: 'upload',
            status: 'pending',
            file,
            originalFile,
            optimized: !!originalFile, // If originalFile exists, this file was optimized
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        this.operations.set(id, operation);
        this.notifyListeners();
        return id;
    }

    /**
     * Add a file URL to the deletion queue
     */
    queueDeletion(url: string): string {
        const id = this.generateId();
        const operation: QueuedOperation = {
            id,
            type: 'delete',
            status: 'pending',
            url,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        this.operations.set(id, operation);
        this.notifyListeners();
        return id;
    }

    /**
     * Remove an operation from the queue
     */
    removeOperation(id: string): boolean {
        const removed = this.operations.delete(id);
        if (removed) {
            this.notifyListeners();
        }
        return removed;
    }

    /**
     * Update operation status
     */
    updateOperationStatus(id: string, status: QueuedOperation['status'], error?: string): void {
        const operation = this.operations.get(id);
        if (operation) {
            operation.status = status;
            operation.updatedAt = Date.now();
            if (error) {
                operation.error = error;
            }
            this.notifyListeners();
        }
    }

    /**
     * Get all operations in the queue
     */
    getAllOperations(): QueuedOperation[] {
        return Array.from(this.operations.values());
    }

    /**
     * Get operations by type
     */
    getOperationsByType(type: 'upload' | 'delete'): QueuedOperation[] {
        return this.getAllOperations().filter(op => op.type === type);
    }

    /**
     * Get operations by status
     */
    getOperationsByStatus(status: QueuedOperation['status']): QueuedOperation[] {
        return this.getAllOperations().filter(op => op.status === status);
    }

    /**
     * Get pending upload operations
     */
    getPendingUploads(): QueuedOperation[] {
        return this.getAllOperations().filter(
            op => op.type === 'upload' && op.status === 'pending'
        );
    }

    /**
     * Get pending deletion operations
     */
    getPendingDeletions(): QueuedOperation[] {
        return this.getAllOperations().filter(
            op => op.type === 'delete' && op.status === 'pending'
        );
    }

    /**
     * Get upload operations that are ready for processing
     */
    getReadyUploads(): QueuedOperation[] {
        return this.getPendingUploads().filter(op => op.file);
    }

    /**
     * Check if queue has any pending operations
     */
    hasPendingOperations(): boolean {
        return this.getOperationsByStatus('pending').length > 0;
    }

    /**
     * Check if queue has any operations in progress
     */
    hasOperationsInProgress(): boolean {
        return this.getOperationsByStatus('processing').length > 0;
    }

    /**
     * Get queue statistics
     */
    getStats() {
        const operations = this.getAllOperations();
        return {
            total: operations.length,
            pending: operations.filter(op => op.status === 'pending').length,
            processing: operations.filter(op => op.status === 'processing').length,
            completed: operations.filter(op => op.status === 'completed').length,
            error: operations.filter(op => op.status === 'error').length,
            uploads: operations.filter(op => op.type === 'upload').length,
            deletions: operations.filter(op => op.type === 'delete').length
        };
    }

    /**
     * Clear all operations from the queue
     */
    clear(): void {
        this.operations.clear();
        this.notifyListeners();
    }

    /**
     * Clear completed operations
     */
    clearCompleted(): void {
        const completedIds = this.getOperationsByStatus('completed').map(op => op.id);
        completedIds.forEach(id => this.operations.delete(id));
        if (completedIds.length > 0) {
            this.notifyListeners();
        }
    }

    /**
     * Clear error operations
     */
    clearErrors(): void {
        const errorIds = this.getOperationsByStatus('error').map(op => op.id);
        errorIds.forEach(id => this.operations.delete(id));
        if (errorIds.length > 0) {
            this.notifyListeners();
        }
    }

    /**
     * Convert queued files to QueuedFile format for compatibility
     */
    getQueuedFiles(): QueuedFile[] {
        return this.getOperationsByType('upload')
            .filter(op => op.file)
            .map(op => ({
                id: op.id,
                file: op.file!,
                originalFile: op.originalFile,
                status: this.mapOperationStatusToQueuedFileStatus(op.status),
                preview: op.preview,
                error: op.error,
                optimized: op.optimized
            }));
    }

    /**
     * Add a listener for queue changes
     */
    addListener(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Generate a unique ID for operations
     */
    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Notify all listeners of queue changes
     */
    private notifyListeners(): void {
        this.listeners.forEach(listener => listener());
    }

    /**
     * Map operation status to QueuedFile status for compatibility
     */
    private mapOperationStatusToQueuedFileStatus(status: QueuedOperation['status']): QueuedFile['status'] {
        switch (status) {
            case 'pending':
                return 'pending';
            case 'processing':
                return 'uploading';
            case 'completed':
                return 'uploaded';
            case 'error':
                return 'error';
            default:
                return 'pending';
        }
    }
}
