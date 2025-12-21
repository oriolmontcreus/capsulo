
import type { FileUploadValue } from './fileUpload.types';
import { globalUploadManager } from './uploadManager';
import { createErrorMessage } from './fileUpload.utils';

// Helper to extract all image URLs from a Lexical editor state object
function extractImageUrls(obj: any): string[] {
    const urls: string[] = [];

    if (!obj || typeof obj !== 'object') return urls;

    // Check if this is a Lexical ImageNode
    if (obj.type === 'image' && typeof obj.src === 'string' && obj.src.startsWith('http')) {
        urls.push(obj.src);
    }

    // If array, process items
    if (Array.isArray(obj)) {
        obj.forEach(item => urls.push(...extractImageUrls(item)));
        return urls;
    }

    // If object, process values
    Object.values(obj).forEach(value => {
        urls.push(...extractImageUrls(value));
    });

    return urls;
}

// Check if a value is a Lexical editor state (has 'root' property)
function isLexicalEditorState(value: any): boolean {
    return value && typeof value === 'object' && 'root' in value;
}

// Check if a value is a translation map containing Lexical states
function isTranslatableLexicalValue(value: any): boolean {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return Object.values(value).some(v => isLexicalEditorState(v));
}

// Check if a value is a rich editor value (either direct or translatable)
function isRichEditorValue(value: any): boolean {
    return isLexicalEditorState(value) || isTranslatableLexicalValue(value);
}

// Extract all image URLs from a value (handles both direct and translatable)
function extractAllImageUrls(value: any): string[] {
    if (!value || typeof value !== 'object') return [];

    if (isLexicalEditorState(value)) {
        // Direct Lexical state
        return extractImageUrls(value);
    }

    if (isTranslatableLexicalValue(value)) {
        // Translatable - extract from all locales
        const urls: string[] = [];
        Object.values(value).forEach(localeValue => {
            if (isLexicalEditorState(localeValue)) {
                urls.push(...extractImageUrls(localeValue));
            }
        });
        return urls;
    }

    return [];
}

// TODO: This is not the best way to do this
// Check if a URL is an R2 bucket URL (should be deleted when removed)
function isR2Url(url: string): boolean {
    return url.includes('.r2.cloudflarestorage.com') ||
        url.includes('.r2.dev') ||
        url.includes('/r2/') ||
        (url.includes('/uploads/') && !url.startsWith('data:'));
}

/**
 * Simple file upload save integration
 */
export const fileUploadSaveIntegration = {
    /**
     * Queue deletions for images removed from rich editor fields
     * @param oldData - The previously saved component data (from pageData.components)
     * @param newFormData - The current form data to be saved
     */
    queueRichEditorImageDeletions(
        oldData: Array<{ id: string; data: Record<string, { type: any; value: any }> }>,
        newFormData: Record<string, Record<string, any>>
    ): void {
        const manager = globalUploadManager;

        oldData.forEach(component => {
            const componentId = component.id;
            const newComponentData = newFormData[componentId] || {};

            Object.entries(component.data).forEach(([fieldName, fieldMeta]) => {
                const oldValue = fieldMeta?.value;
                const newValue = newComponentData[fieldName];

                if (!isRichEditorValue(oldValue)) return;

                const oldImageUrls = extractAllImageUrls(oldValue);
                const newImageUrls = new Set(extractAllImageUrls(newValue));

                const removedImages = oldImageUrls.filter(url => !newImageUrls.has(url));

                removedImages.forEach(url => {
                    if (isR2Url(url)) {
                        manager.queueDeletion(url, componentId, fieldName);
                    }
                });
            });
        });
    },

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