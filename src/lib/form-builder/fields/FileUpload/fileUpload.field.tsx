import React, { useCallback, useState, useRef, useEffect } from 'react';
import type { FileUploadField as FileUploadFieldType, FileUploadValue, QueuedFile } from './fileUpload.types';
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUploadManager } from './uploadManager';
import { validateFiles, getValidationErrorMessage, createSanitizedFile, formatFileSize, checkUploadSupport, createGracefulDegradationMessage } from './fileUpload.utils';
import { Upload, X, Image, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

// Simple Badge component
const Badge: React.FC<{
    children: React.ReactNode;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    className?: string;
}> = ({ children, variant = 'default', className }) => {
    const baseClasses = "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium";
    const variantClasses = {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "border border-input bg-background text-foreground"
    };

    return (
        <span className={cn(baseClasses, variantClasses[variant], className)}>
            {children}
        </span>
    );
};



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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadManager = useUploadManager();

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

    // Handle file selection
    const handleFileSelect = useCallback(async (files: FileList) => {
        const fileArray = Array.from(files);

        // Clear previous validation errors
        setValidationErrors([]);

        // Validate all files
        const validation = validateFiles(fileArray, field, currentValue.files.length + queuedFiles.length);

        if (!validation.isValid) {
            // Show validation errors
            const errorMessage = getValidationErrorMessage(validation.errors);
            setValidationErrors([errorMessage]);
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
                setValidationErrors(prev => [...prev, `Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`]);
            }
        }
    }, [field, currentValue.files.length, queuedFiles.length, uploadManager]);

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

    // Clear validation errors when files change
    useEffect(() => {
        if (validationErrors.length > 0) {
            setValidationErrors([]);
        }
    }, [queuedFiles.length, currentValue.files.length, validationErrors.length]);



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

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept={field.accept}
                multiple={field.multiple}
                onChange={handleInputChange}
                className="hidden"
                aria-hidden="true"
            />

            {/* Drop zone */}
            <div
                className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                    isDragOver && !isDisabled ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                    displayError && "border-destructive",
                    (isDisabled || !canAddMore) && "opacity-50 pointer-events-none"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {canAddMore && !isDisabled ? (
                    <div className="space-y-2">
                        <div className="text-muted-foreground">
                            <svg
                                className="mx-auto h-12 w-12 mb-4"
                                stroke="currentColor"
                                fill="none"
                                viewBox="0 0 48 48"
                                aria-hidden="true"
                            >
                                <path
                                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            <p className="text-sm">
                                Drag and drop files here, or{' '}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-primary hover:underline font-medium"
                                >
                                    browse
                                </button>
                            </p>
                            {field.accept && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Accepted types: {field.accept}
                                </p>
                            )}
                            {field.maxSize && (
                                <p className="text-xs text-muted-foreground">
                                    Max size: {formatFileSize(field.maxSize)}
                                </p>
                            )}
                        </div>
                    </div>
                ) : isDisabled ? (
                    <div className="text-muted-foreground text-sm space-y-2">
                        <p>File upload is currently unavailable</p>
                        {systemErrors.length > 0 && (
                            <div className="text-xs text-destructive whitespace-pre-line">
                                {systemErrors.join('\n')}
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-sm">
                        Maximum number of files reached ({field.maxFiles})
                    </p>
                )}
            </div>

            {/* File list */}
            {hasFiles && (
                <div className="space-y-3 mt-4">
                    {/* Uploaded files */}
                    {currentValue.files.map((file: any, index: number) => (
                        <div
                            key={`uploaded-${index}`}
                            className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800"
                        >
                            {/* File thumbnail/icon */}
                            <div className="flex-shrink-0">
                                {file.type.startsWith('image/') ? (
                                    <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden border">
                                        <img
                                            src={file.url}
                                            alt={file.name}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center border">
                                        <FileText className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                )}
                            </div>

                            {/* File info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-medium truncate">{file.name}</p>
                                    <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Uploaded
                                    </Badge>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">
                                        {formatFileSize(file.size)} • {file.type}
                                    </p>


                                </div>
                            </div>

                            {/* Remove button */}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeUploadedFile(index)}
                                className="text-destructive hover:text-destructive flex-shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}

                    {/* Queued files */}
                    {queuedFiles.map((queuedFile) => (
                        <div
                            key={queuedFile.id}
                            className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800"
                        >
                            {/* File thumbnail/icon */}
                            <div className="flex-shrink-0">
                                {queuedFile.preview ? (
                                    <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden border">
                                        <img
                                            src={queuedFile.preview}
                                            alt={queuedFile.file.name}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    </div>
                                ) : queuedFile.file.type.startsWith('image/') ? (
                                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center border">
                                        <Image className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center border">
                                        <FileText className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                )}
                            </div>

                            {/* File info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-medium truncate">{queuedFile.file.name}</p>
                                    {queuedFile.status === 'optimizing' && (
                                        <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            Optimizing
                                        </Badge>
                                    )}
                                    {queuedFile.status === 'uploading' && (
                                        <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                                            <Upload className="w-3 h-3 mr-1" />
                                            Uploading
                                        </Badge>
                                    )}
                                    {queuedFile.status === 'pending' && (
                                        <Badge variant="outline" className="text-xs">
                                            Queued
                                        </Badge>
                                    )}
                                    {queuedFile.status === 'error' && (
                                        <Badge variant="destructive" className="text-xs">
                                            <AlertCircle className="w-3 h-3 mr-1" />
                                            Error
                                        </Badge>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">
                                        {formatFileSize(queuedFile.file.size)} • {queuedFile.file.type}
                                    </p>

                                    {/* Simple status message for processing */}
                                    {(queuedFile.status === 'optimizing' || queuedFile.status === 'uploading') && (
                                        <p className="text-xs text-muted-foreground">
                                            {queuedFile.status === 'optimizing' ? 'Optimizing image...' : 'Uploading to storage...'}
                                        </p>
                                    )}



                                    {/* Error message */}
                                    {queuedFile.error && (
                                        <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                                            {queuedFile.error}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Remove button */}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeQueuedFile(queuedFile.id)}
                                className="text-destructive hover:text-destructive flex-shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Error message or description */}
            {displayError ? (
                <FieldError>{displayError}</FieldError>
            ) : field.description ? (
                <FieldDescription>{field.description}</FieldDescription>
            ) : null}
        </Field>
    );
});