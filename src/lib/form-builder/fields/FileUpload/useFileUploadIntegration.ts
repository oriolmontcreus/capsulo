
import type { FileUploadValue } from './fileUpload.types';
import { globalUploadManager } from './uploadManager';
import { createErrorMessage } from './fileUpload.utils';

/**
 * Simple file upload save integration
 */
export const fileUploadSaveIntegration = {
    /**
     * Process file operations for form data before save
     * @param formData - Nested structure: { [componentId]: { [fieldName]: value } }
     */
    async processFormDataForSave(
        formData: Record<string, Record<string, any>>
    ): Promise<Record<string, Record<string, any>>> {
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
        // We need to process both standard FileUpload fields AND RichText fields
        const updatedFormData = { ...formData };

        // Create a map of uploadId -> uploadedFile for quick lookup
        const uploadedFilesMap = new Map<string, typeof result.uploadedFiles[0]>();
        result.uploadedFiles.forEach(file => {
            if (file.id) {
                uploadedFilesMap.set(file.id, file);
            }
        });

        // Helper to process any object to find and update Rich Text image nodes
        const processRichTextNodes = (obj: any): any => {
            if (!obj || typeof obj !== 'object') return obj;

            // Check if this is a Lexical ImageNode with a pending upload
            if (obj.type === 'image' && obj.uploadId && typeof obj.src === 'string') {
                const uploadedFile = uploadedFilesMap.get(obj.uploadId);
                if (uploadedFile) {
                    // Update the node with the real URL and remove uploadId
                    return {
                        ...obj,
                        src: uploadedFile.url,
                        uploadId: undefined
                    };
                }
            }

            // If array, process items
            if (Array.isArray(obj)) {
                return obj.map(item => processRichTextNodes(item));
            }

            // If object (and not a React element check roughly), process values
            const newObj: Record<string, any> = {};
            let hasChanges = false;

            Object.entries(obj).forEach(([key, value]) => {
                const newValue = processRichTextNodes(value);
                newObj[key] = newValue;
                if (newValue !== value) hasChanges = true;
            });

            return hasChanges ? newObj : obj;
        };

        // First pass: Process existing FileUpload fields (legacy logic + grouped updates)
        Object.entries(result.uploadedFilesByField).forEach(([fieldKey, uploadedFiles]) => {
            const [componentId, fieldName] = fieldKey.split(':');

            if (!updatedFormData[componentId]) {
                updatedFormData[componentId] = {};
            }

            const fieldValue = updatedFormData[componentId][fieldName];

            if (fieldValue && typeof fieldValue === 'object' && 'files' in fieldValue) {
                const fileUploadValue = fieldValue as FileUploadValue;
                const updatedFiles = [...fileUploadValue.files, ...uploadedFiles];
                updatedFormData[componentId][fieldName] = { files: updatedFiles };
            }
        });

        // Second pass: Process Rich Text content recursively for all components
        // This covers any field that might contain a Rich Text state with pending image uploads
        Object.keys(updatedFormData).forEach(componentId => {
            updatedFormData[componentId] = processRichTextNodes(updatedFormData[componentId]);
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