
import type { FileUploadValue } from './fileUpload.types';
import { globalUploadManager } from './uploadManager';
import { createErrorMessage } from './fileUpload.utils';

/**
 * Simple file upload save integration
 */
export const fileUploadSaveIntegration = {
    /**
     * Process file operations for form data before save
     */
    async processFormDataForSave(
        formData: Record<string, any>
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
        const result = await manager.processQueue();

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