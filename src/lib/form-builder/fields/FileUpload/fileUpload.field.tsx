import React, { useCallback, useState, useRef, useEffect } from 'react';
import type { FileUploadField as FileUploadFieldType, FileUploadValue, QueuedFile } from './fileUpload.types';
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';
import { useUploadManager } from './uploadManager';
import { validateFiles, getValidationErrorMessage, createSanitizedFile, checkUploadSupport, createGracefulDegradationMessage } from './fileUpload.utils';
import { FileUploadDropZone, FileUploadError, FileUploadList } from './components';

interface FileUploadFieldProps {
    field: FileUploadFieldType;
    value: FileUploadValue | undefined;
    onChange: (value: FileUploadValue) => void;
    error?: string;
}

export const FileUploadField: React.FC<FileUploadFieldProps> = React.memo(({
    field,
    value,
    onChange,
    error
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [systemErrors, setSystemErrors] = useState<string[]>([]);
    const [temporaryError, setTemporaryError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadManager = useUploadManager();
    const temporaryErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Simplified value handling - ensure we always have a valid structure
    const currentValue = React.useMemo(() => {
        if (!value || typeof value !== 'object' || !Array.isArray(value.files)) {
            return { files: [] };
        }
        return value;
    }, [value]);

    // Initialize field value if needed
    useEffect(() => {
        if (!value || typeof value !== 'object' || !Array.isArray(value.files)) {
            onChange({ files: [] });
        }
    }, [value, onChange]);

    // Check system support on mount
    useEffect(() => {
        const support = checkUploadSupport();
        if (!support.supported) {
            const degradationMessage = createGracefulDegradationMessage(support.errors);
            setSystemErrors([degradationMessage]);
        }

        // Check R2 configuration
        if (!uploadManager.isR2Configured()) {
            const configStatus = uploadManager.getR2ConfigStatus();
            const errorMessage = configStatus.errors.length > 0
                ? `Upload service not configured: ${configStatus.errors.join('; ')}`
                : 'Upload service not configured';
            setSystemErrors(prev => [...prev, errorMessage]);
        }
    }, [uploadManager]);

    // Get queued files from upload manager
    const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);

    // Listen to upload manager changes
    useEffect(() => {
        const updateQueuedFiles = () => {
            setQueuedFiles(uploadManager.getQueuedFiles());
        };

        updateQueuedFiles();
        const unsubscribe = uploadManager.addQueueListener(updateQueuedFiles);
        return unsubscribe;
    }, [uploadManager]);

    // Simplified pending uploads tracking
    useEffect(() => {
        const hasPending = queuedFiles.length > 0;
        if (hasPending !== !!currentValue._hasPendingUploads) {
            onChange({
                files: currentValue.files,
                ...(hasPending && { _hasPendingUploads: true, _queuedCount: queuedFiles.length })
            });
        }
    }, [queuedFiles.length, currentValue.files, currentValue._hasPendingUploads, onChange]);

    // Show temporary error that auto-dismisses
    const showTemporaryError = useCallback((message: string, duration: number = 5000) => {
        // Clear any existing timeout
        if (temporaryErrorTimeoutRef.current) {
            clearTimeout(temporaryErrorTimeoutRef.current);
        }

        setTemporaryError(message);

        // Auto-dismiss after duration
        temporaryErrorTimeoutRef.current = setTimeout(() => {
            setTemporaryError(null);
            temporaryErrorTimeoutRef.current = null;
        }, duration);
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (temporaryErrorTimeoutRef.current) {
                clearTimeout(temporaryErrorTimeoutRef.current);
            }
        };
    }, []);

    // Handle file selection
    const handleFileSelect = useCallback(async (files: FileList) => {
        const fileArray = Array.from(files);

        // Clear previous validation errors
        setValidationErrors([]);

        // Validate all files
        const validation = validateFiles(fileArray, field, currentValue.files.length + queuedFiles.length);

        if (!validation.isValid) {
            // Show validation errors as temporary error
            const errorMessage = getValidationErrorMessage(validation.errors);
            showTemporaryError(errorMessage);
            return;
        }

        // Process valid files
        for (const file of fileArray) {
            // Check file count limit (double-check after validation)
            if (field.maxFiles && (currentValue.files.length + queuedFiles.length) >= field.maxFiles) {
                break;
            }

            try {
                // Create sanitized file if needed
                const sanitizedFile = createSanitizedFile(file);

                // Queue the file for upload (this will handle optimization automatically)
                await uploadManager.queueUpload(sanitizedFile);
            } catch (error) {
                console.error('Failed to queue file for upload:', error);
                const errorMsg = `Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                showTemporaryError(errorMsg);
            }
        }
    }, [field, currentValue.files.length, queuedFiles.length, uploadManager, showTemporaryError]);

    // Simplified drag and drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files);
        }
    }, [handleFileSelect]);

    // Handle file input change
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            handleFileSelect(e.target.files);
            e.target.value = ''; // Reset to allow selecting same file again
        }
    }, [handleFileSelect]);

    // Remove queued file
    const removeQueuedFile = useCallback((fileId: string) => {
        uploadManager.removeOperation(fileId);
    }, [uploadManager]);

    // Remove uploaded file
    const removeUploadedFile = useCallback((index: number) => {
        const fileToRemove = currentValue.files[index];
        if (fileToRemove) {
            // Queue the file for deletion
            uploadManager.queueDeletion(fileToRemove.url);

            // Remove from current value immediately for UI feedback
            const newFiles = [...currentValue.files];
            newFiles.splice(index, 1);
            const newValue = { files: newFiles };
            onChange(newValue);
        }
    }, [currentValue.files, onChange, uploadManager]);

    // Remove all files
    const removeAllFiles = useCallback(() => {
        // Clear all queued files
        queuedFiles.forEach(qf => removeQueuedFile(qf.id));
        // Clear all uploaded files
        onChange({ files: [] });
    }, [queuedFiles, removeQueuedFile, onChange]);

    // Dismiss temporary error
    const dismissTemporaryError = useCallback(() => {
        setTemporaryError(null);
        if (temporaryErrorTimeoutRef.current) {
            clearTimeout(temporaryErrorTimeoutRef.current);
            temporaryErrorTimeoutRef.current = null;
        }
    }, []);

    // Format display logic
    const getAcceptedFormatsDisplay = useCallback(() => {
        if (!field.accept) {
            return 'All file types';
        }

        // Parse accepted formats
        const formats = field.accept
            .split(',')
            .map(format => {
                const trimmed = format.trim();
                // Handle MIME types like "image/*" or "audio/mpeg"
                if (trimmed.includes('/')) {
                    if (trimmed.endsWith('/*')) {
                        // Convert "image/*" to "IMAGE"
                        return trimmed.split('/')[0].toUpperCase();
                    }
                    // Convert "audio/mpeg" to "MPEG"
                    return trimmed.split('/')[1].toUpperCase();
                }
                // Handle extensions like ".mp3"
                return trimmed.replace(/^\./, '').toUpperCase();
            })
            .filter(Boolean);

        if (formats.length <= 5) {
            return formats.join(', ');
        }

        // For many formats, show first few and indicate more
        return {
            display: `${formats.slice(0, 3).join(', ')} and ${formats.length - 3} more`,
            allFormats: formats
        };
    }, [field.accept]);

    const formatsDisplay = getAcceptedFormatsDisplay();

    // Responsive zoom margin - smaller on mobile, larger on desktop
    const [zoomMargin, setZoomMargin] = useState(100);

    useEffect(() => {
        const updateZoomMargin = () => {
            setZoomMargin(window.innerWidth < 768 ? 20 : 100);
        };

        updateZoomMargin();
        window.addEventListener('resize', updateZoomMargin);
        return () => window.removeEventListener('resize', updateZoomMargin);
    }, []);

    const hasFiles = currentValue.files.length > 0 || queuedFiles.length > 0;
    const canAddMore = !field.maxFiles || (currentValue.files.length + queuedFiles.length) < field.maxFiles;
    const isDisabled = systemErrors.length > 0 || !uploadManager.isR2Configured();

    // Combine all error messages
    const allErrors = [error, ...validationErrors, ...systemErrors].filter(Boolean);
    const displayError = allErrors.length > 0 ? allErrors.join('; ') : undefined;

    return (
        <Field data-invalid={!!displayError}>
            <FieldLabel htmlFor={field.name} required={field.required}>
                {field.label || field.name}
            </FieldLabel>

            <div className="flex flex-col gap-2">
                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={field.accept}
                    multiple={field.multiple}
                    onChange={handleInputChange}
                    className="sr-only"
                    aria-label="Upload files"
                />

                {/* Drop zone */}
                <FileUploadDropZone
                    isDragOver={isDragOver}
                    hasFiles={hasFiles}
                    canAddMore={canAddMore}
                    isDisabled={isDisabled}
                    displayError={displayError}
                    formatsDisplay={formatsDisplay}
                    maxSize={field.maxSize}
                    maxFiles={field.maxFiles}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onSelectClick={() => fileInputRef.current?.click()}
                    systemErrors={systemErrors}
                />

                {/* Temporary error notification (auto-dismisses) */}
                {temporaryError && (
                    <FileUploadError
                        message={temporaryError}
                        onDismiss={dismissTemporaryError}
                    />
                )}

                {/* Validation errors */}
                {validationErrors.length > 0 && (
                    <div
                        className="flex items-center gap-1 text-xs text-destructive"
                        role="alert"
                    >
                        <span>{validationErrors[0]}</span>
                    </div>
                )}

                {/* File list */}
                {hasFiles && (
                    <FileUploadList
                        uploadedFiles={currentValue.files}
                        queuedFiles={queuedFiles}
                        zoomMargin={zoomMargin}
                        onRemoveUploaded={removeUploadedFile}
                        onRemoveQueued={removeQueuedFile}
                        onRemoveAll={removeAllFiles}
                    />
                )}
            </div>

            {/* Error message or description */}
            {displayError ? (
                <FieldError>{displayError}</FieldError>
            ) : field.description ? (
                <FieldDescription>{field.description}</FieldDescription>
            ) : null}
        </Field>
    );
});
