import { useCallback, useEffect, useRef } from 'react';
import type { FileUploadValue } from './fileUpload.types';
import { globalUploadManager, type BatchProgressCallback } from './uploadManager';
import { createErrorMessage } from './fileUpload.utils';

/**
 * Integration hook for FileUpload fields with the CMS save workflow
 */
export function useFileUploadIntegration() {
    const saveHandlerRef = useRef<(() => Promise<void>) | null>(null);

    /**
     * Register a save handler that will be called during CMS save operations
     */
    const registerSaveHandler = useCallback((handler: () => Promise<void>) => {
        saveHandlerRef.current = handler;
    }, []);

    /**
     * Process all queued file operations and update form data
     * This should be called before the standard CMS save process
     */
    const processFileOperations = useCallback(async (
        formData: Record<string, any>,
        onProgress?: BatchProgressCallback
    ): Promise<Record<string, any>> => {
        const manager = globalUploadManager;

        // Check if there are any pending operations
        if (!manager.getQueueStatus().hasPendingOperations) {
            return formData;
        }

        // Validate that R2 is configured
        const readiness = manager.validateReadiness();
        if (!readiness.ready) {
            const errorMessage = `File upload service is not available: ${readiness.errors.join(', ')}`;
            throw new Error(errorMessage);
        }

        // Process the queue with error handling
        const result = await manager.processQueue(onProgress);

        if (!result.success && !result.partialFailure) {
            const errorMessage = createErrorMessage(result.errors);
            throw new Error(`File upload failed: ${errorMessage}`);
        }

        // Update form data with uploaded file URLs
        const updatedFormData = { ...formData };

        // Find all FileUpload fields in the form data and update them
        Object.keys(updatedFormData).forEach(fieldName => {
            const fieldValue = updatedFormData[fieldName];

            // Check if this looks like a FileUpload field value
            if (fieldValue && typeof fieldValue === 'object' && 'files' in fieldValue) {
                const fileUploadValue = fieldValue as FileUploadValue;

                // Add newly uploaded files to the existing files
                const updatedFiles = [
                    ...fileUploadValue.files,
                    ...result.uploadedFiles
                ];

                updatedFormData[fieldName] = {
                    files: updatedFiles
                };
            }
        });

        // Clear completed operations
        manager.clearCompleted();

        // If there were partial failures, log them but don't fail the save
        if (result.partialFailure) {
            const errorMessage = createErrorMessage(result.errors);
            console.warn('Some file operations failed:', errorMessage);

            // You might want to show a toast notification here
            // or store the errors for display to the user
        }

        return updatedFormData;
    }, []);

    /**
     * Hook into the global save process
     * This effect sets up the integration with the CMS save workflow
     */
    useEffect(() => {
        // Store the original save handler if it exists
        const originalHandler = saveHandlerRef.current;

        // Create a new handler that processes files first
        const enhancedHandler = async () => {
            // If there's an original handler, call it after file processing
            if (originalHandler) {
                await originalHandler();
            }
        };

        saveHandlerRef.current = enhancedHandler;

        // Cleanup
        return () => {
            saveHandlerRef.current = originalHandler;
        };
    }, []);

    return {
        registerSaveHandler,
        processFileOperations,
        uploadManager: globalUploadManager
    };
}

/**
 * Simple file upload save integration
 */
export const fileUploadSaveIntegration = {
    /**
     * Process file operations for form data before save
     */
    async processFormDataForSave(
        formData: Record<string, any>,
        onProgress?: BatchProgressCallback
    ): Promise<Record<string, any>> {
        const manager = globalUploadManager;

        // Check if there are any pending operations
        const queueStatus = manager.getQueueStatus();
        if (!queueStatus.hasPendingOperations) {
            return formData;
        }

        // Validate readiness
        const readiness = manager.validateReadiness();
        if (!readiness.ready) {
            throw new Error(`File upload service is not available: ${readiness.errors.join(', ')}`);
        }

        // Process the queue
        const result = await manager.processQueue(onProgress);

        if (!result.success && !result.partialFailure) {
            const errorMessage = createErrorMessage(result.errors);
            throw new Error(`File upload failed: ${errorMessage}`);
        }

        // Update form data with uploaded file URLs
        const updatedFormData = { ...formData };

        Object.keys(updatedFormData).forEach(fieldName => {
            const fieldValue = updatedFormData[fieldName];

            if (fieldValue && typeof fieldValue === 'object' && 'files' in fieldValue) {
                const fileUploadValue = fieldValue as FileUploadValue;
                const updatedFiles = [...fileUploadValue.files, ...result.uploadedFiles];
                updatedFormData[fieldName] = { files: updatedFiles };
            }
        });

        manager.clearCompleted();

        if (result.partialFailure) {
            console.warn('Some file operations failed:', createErrorMessage(result.errors));
        }

        return updatedFormData;
    },

    /**
     * Check if any FileUpload fields have pending operations
     */
    hasPendingFileOperations(): boolean {
        return globalUploadManager.getQueueStatus().hasPendingOperations;
    },

    /**
     * Get current upload status
     */
    getUploadStatus() {
        return globalUploadManager.getQueueStatus();
    }
};

/**
 * Hook for CMS components to integrate with file upload processing
 */
export function useFileUploadSaveIntegration() {
    return fileUploadSaveIntegration;
}