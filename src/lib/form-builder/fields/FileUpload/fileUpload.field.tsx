import React, { useCallback, useState, useRef, useEffect } from 'react';
import type { FileUploadField as FileUploadFieldType, FileUploadValue, QueuedFile } from './fileUpload.types';
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ImageZoom } from '@/components/ui/image-zoom';
import { cn } from '@/lib/utils';
import { useUploadManager } from './uploadManager';
import { validateFiles, getValidationErrorMessage, createSanitizedFile, formatFileSize, checkUploadSupport, createGracefulDegradationMessage } from './fileUpload.utils';
import { Upload, X, Image, FileText, AlertCircle, Loader2, FileArchive, FileSpreadsheet, Video, Headphones, File } from 'lucide-react';

// Helper function to get appropriate file icon based on file type
const getFileIcon = (file: { type: string; name: string }) => {
    const fileType = file.type;
    const fileName = file.name;

    if (fileType.includes("pdf") ||
        fileName.endsWith(".pdf") ||
        fileType.includes("word") ||
        fileName.endsWith(".doc") ||
        fileName.endsWith(".docx")) {
        return <FileText className="size-4 opacity-60" />;
    } else if (fileType.includes("zip") ||
        fileType.includes("archive") ||
        fileName.endsWith(".zip") ||
        fileName.endsWith(".rar")) {
        return <FileArchive className="size-4 opacity-60" />;
    } else if (fileType.includes("excel") ||
        fileType.includes("spreadsheet") ||
        fileName.endsWith(".xls") ||
        fileName.endsWith(".xlsx")) {
        return <FileSpreadsheet className="size-4 opacity-60" />;
    } else if (fileType.includes("video/")) {
        return <Video className="size-4 opacity-60" />;
    } else if (fileType.includes("audio/")) {
        return <Headphones className="size-4 opacity-60" />;
    } else if (fileType.startsWith("image/")) {
        return <Image className="size-4 opacity-60" />;
    }

    return <File className="size-4 opacity-60" />;
};

// Helper function to check if a file is a PDF
const isPDF = (file: { type: string; name: string }) => {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
};

// Helper function to handle PDF preview
const handlePDFPreview = (url: string, fileName: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
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
                <div
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    data-dragging={isDragOver || undefined}
                    data-files={hasFiles || undefined}
                    className={cn(
                        "relative flex min-h-52 flex-col items-center overflow-hidden rounded-lg border border-dashed border-input p-4 transition-colors",
                        "not-data-[files]:justify-center has-[input:focus]:border-ring has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 bg-sidebar",
                        isDragOver && !isDisabled && "bg-brand/20 data-[dragging=true]:bg-brand/20",
                        displayError && "border-destructive",
                        (isDisabled || !canAddMore) && "opacity-50 pointer-events-none"
                    )}
                >
                    {/* Max constraints - top right */}
                    {(field.maxSize || field.maxFiles) && (
                        <div className="absolute top-3 right-3 text-xs text-muted-foreground flex flex-col items-end">
                            {field.maxSize && (
                                <span>{Math.round(field.maxSize / (1024 * 1024))}MB max</span>
                            )}
                            {field.maxFiles && (
                                <span>{field.maxFiles} files max</span>
                            )}
                        </div>
                    )}
                    {canAddMore && !isDisabled ? (
                        <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
                            <div
                                className="mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-background"
                                aria-hidden="true"
                            >
                                <Upload className="size-4 opacity-60" />
                            </div>
                            <p className="mb-1.5 text-sm font-medium">Drop your files here</p>
                            <div className="text-xs text-muted-foreground">
                                {typeof formatsDisplay === 'string' ? (
                                    <p>{formatsDisplay}</p>
                                ) : (
                                    <Popover>
                                        <p>
                                            {formatsDisplay.display.split(' and ')[0]} and{' '}
                                            <PopoverTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                                                    aria-label="Show all accepted formats"
                                                >
                                                    {formatsDisplay.display.split(' and ')[1]}
                                                </button>
                                            </PopoverTrigger>
                                        </p>
                                        <PopoverContent className="w-80 p-3" align="center">
                                            <div className="text-xs">
                                                <p className="font-medium mb-2">Accepted formats:</p>
                                                <div className="grid grid-cols-3 gap-1">
                                                    {formatsDisplay.allFormats.map((format, index) => (
                                                        <span
                                                            key={index}
                                                            className="text-muted-foreground text-center py-1 px-2 bg-muted/50 rounded text-[10px] truncate"
                                                            title={format}
                                                        >
                                                            {format}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                className="mt-4"
                                onClick={() => fileInputRef.current?.click()}
                                type="button"
                            >
                                <Upload className="-ms-1 opacity-60" aria-hidden="true" />
                                Select files
                            </Button>
                        </div>
                    ) : isDisabled ? (
                        <div className="text-muted-foreground text-sm space-y-2 text-center">
                            <p>File upload is currently unavailable</p>
                            {systemErrors.length > 0 && (
                                <div className="text-xs text-destructive whitespace-pre-line">
                                    {systemErrors.join('\n')}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-sm text-center">
                            Maximum number of files reached ({field.maxFiles})
                        </p>
                    )}
                </div>

                {/* Validation errors */}
                {validationErrors.length > 0 && (
                    <div
                        className="flex items-center gap-1 text-xs text-destructive"
                        role="alert"
                    >
                        <AlertCircle className="size-3 shrink-0" />
                        <span>{validationErrors[0]}</span>
                    </div>
                )}

                {/* File list */}
                {hasFiles && (
                    <div className="space-y-2">
                        {/* Uploaded files */}
                        {currentValue.files.map((file: any, index: number) => (
                            <div
                                key={`uploaded-${index}`}
                                className="flex items-center justify-between gap-2 border-t border-b p-2 pe-3"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div
                                        className={cn(
                                            "aspect-square shrink-0 rounded bg-accent group",
                                            isPDF(file) && "cursor-pointer hover:bg-accent/80 transition-colors"
                                        )}
                                        onClick={isPDF(file) ? () => handlePDFPreview(file.url, file.name) : undefined}
                                        title={isPDF(file) ? `Click to preview ${file.name}` : undefined}
                                    >
                                        {file.type.startsWith('image/') ? (
                                            <ImageZoom className="size-10 rounded-[inherit] overflow-hidden" zoomMargin={zoomMargin}>
                                                <img
                                                    src={file.url}
                                                    alt={file.name}
                                                    className="size-10 rounded-[inherit] object-cover transition-all duration-200 group-hover:brightness-75"
                                                    loading="lazy"
                                                />
                                            </ImageZoom>
                                        ) : (
                                            <div className="size-10 rounded-[inherit] flex items-center justify-center">
                                                {getFileIcon(file)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex min-w-0 flex-col gap-0.5">
                                        <p
                                            className={cn(
                                                "truncate text-[13px] font-medium",
                                                isPDF(file) && "cursor-pointer hover:text-foreground/80 transition-colors"
                                            )}
                                            onClick={isPDF(file) ? () => handlePDFPreview(file.url, file.name) : undefined}
                                            title={isPDF(file) ? `Click to preview ${file.name}` : undefined}
                                        >
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                    </div>
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="-me-2 size-8 text-muted-foreground/80 hover:text-foreground"
                                    onClick={() => removeUploadedFile(index)}
                                    aria-label="Remove file"
                                    type="button"
                                >
                                    <X aria-hidden="true" />
                                </Button>
                            </div>
                        ))}

                        {/* Queued files */}
                        {queuedFiles.map((queuedFile) => (
                            <div
                                key={queuedFile.id}
                                className="flex items-center justify-between gap-2  border-t border-b p-2 pe-3"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="aspect-square shrink-0 rounded bg-accent relative group">
                                        {queuedFile.preview ? (
                                            <ImageZoom className="size-10 rounded-[inherit] overflow-hidden" zoomMargin={zoomMargin}>
                                                <img
                                                    src={queuedFile.preview}
                                                    alt={queuedFile.file.name}
                                                    className="size-10 rounded-[inherit] object-cover transition-all duration-200 group-hover:brightness-75"
                                                    loading="lazy"
                                                />
                                            </ImageZoom>
                                        ) : queuedFile.file.type.startsWith('image/') ? (
                                            <div className="size-10 rounded-[inherit] flex items-center justify-center">
                                                <Image className="size-4 text-muted-foreground" />
                                            </div>
                                        ) : (
                                            <div className="size-10 rounded-[inherit] flex items-center justify-center">
                                                {getFileIcon(queuedFile.file)}
                                            </div>
                                        )}
                                        {/* Status overlay */}
                                        {(queuedFile.status === 'optimizing' || queuedFile.status === 'uploading') && (
                                            <div className="absolute inset-0 bg-black/50 rounded-[inherit] flex items-center justify-center z-10">
                                                <Loader2 className="size-3 text-white animate-spin" />
                                            </div>
                                        )}
                                        {queuedFile.status === 'error' && (
                                            <div className="absolute inset-0 bg-destructive/50 rounded-[inherit] flex items-center justify-center z-10">
                                                <AlertCircle className="size-3 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex min-w-0 flex-col gap-0.5">
                                        <div className="flex items-center gap-2">
                                            <p className="truncate text-[13px] font-medium">{queuedFile.file.name}</p>
                                            {queuedFile.status === 'optimizing' && (
                                                <span className="text-xs text-muted-foreground">Optimizing...</span>
                                            )}
                                            {queuedFile.status === 'uploading' && (
                                                <span className="text-xs text-muted-foreground">Uploading...</span>
                                            )}
                                            {queuedFile.status === 'error' && (
                                                <span className="text-xs text-destructive">Error</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{formatFileSize(queuedFile.file.size)}</p>
                                        {queuedFile.error && (
                                            <p className="text-xs text-destructive">{queuedFile.error}</p>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="-me-2 size-8 text-muted-foreground/80 hover:text-foreground"
                                    onClick={() => removeQueuedFile(queuedFile.id)}
                                    aria-label="Remove file"
                                    type="button"
                                >
                                    <X aria-hidden="true" />
                                </Button>
                            </div>
                        ))}

                        {/* Remove all files button */}
                        {(currentValue.files.length + queuedFiles.length) > 1 && (
                            <div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        // Clear all queued files
                                        queuedFiles.forEach(qf => removeQueuedFile(qf.id));
                                        // Clear all uploaded files
                                        onChange({ files: [] });
                                    }}
                                    type="button"
                                >
                                    Remove all files
                                </Button>
                            </div>
                        )}
                    </div>
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