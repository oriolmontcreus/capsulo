import React, { useCallback, useState, useRef, useEffect } from 'react';
import type { FileUploadField as FileUploadFieldType, FileUploadValue, QueuedFile } from './fileUpload.types';
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';
import { useUploadManager } from './uploadManager';
import { validateFiles, getValidationErrorMessage, createSanitizedFile, checkUploadSupport, createGracefulDegradationMessage } from './fileUpload.utils';
import { FileUploadDropZone, FileUploadError, FileUploadList, SvgEditorModal } from './components';
import { InlineVariant } from './variants/inline';

interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

interface FileUploadFieldProps {
    field: FileUploadFieldType;
    value: FileUploadValue | undefined;
    onChange: (value: FileUploadValue) => void;
    error?: string;
    componentData?: ComponentData;
}

export const FileUploadField: React.FC<FileUploadFieldProps> = React.memo(({
    field,
    value,
    onChange,
    error,
    componentData
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [systemErrors, setSystemErrors] = useState<string[]>([]);
    const [temporaryError, setTemporaryError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadManager = useUploadManager();
    const temporaryErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // SVG editor state
    const [svgEditorOpen, setSvgEditorOpen] = useState(false);
    const [editingSvgIndex, setEditingSvgIndex] = useState<number | null>(null);
    const [editingQueuedSvgId, setEditingQueuedSvgId] = useState<string | null>(null);

    // Clipboard state
    const [isHovering, setIsHovering] = useState(false);
    const pasteTargetRef = useRef<HTMLDivElement>(null);
    const isPastingRef = useRef(false); // Prevent double paste

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

    // Get queued files from upload manager (filtered by this field)
    const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);

    // Listen to upload manager changes
    useEffect(() => {
        const updateQueuedFiles = () => {
            setQueuedFiles(uploadManager.getQueuedFilesForField(componentData?.id, field.name));
        };

        updateQueuedFiles();
        const unsubscribe = uploadManager.addQueueListener(updateQueuedFiles);
        return unsubscribe;
    }, [uploadManager, componentData?.id, field.name]);

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

    // Destructure values for stable callback dependencies
    const fieldName = field.name;
    const componentId = componentData?.id;

    // Handle file selection
    const handleFileSelect = useCallback(async (files: FileList) => {
        const fileArray = Array.from(files);

        // Clear previous validation errors
        setValidationErrors([]);

        // Check if this is single-file mode (for replacement behavior)
        const isSingleMode = !field.multiple && (field.maxFiles === 1 || !field.maxFiles);

        // Validate all files
        const validation = validateFiles(fileArray, field, currentValue.files.length + queuedFiles.length);

        if (!validation.isValid) {
            // Show validation errors as temporary error
            const errorMessage = getValidationErrorMessage(validation.errors);
            showTemporaryError(errorMessage);
            return;
        }

        // In single-file mode, if we already have a file, remove it first (replacement behavior)
        if (isSingleMode && (currentValue.files.length > 0 || queuedFiles.length > 0)) {
            // Clear existing files and queued uploads for this field only
            onChange({ files: [] });
            queuedFiles.forEach(qf => uploadManager.removeOperation(qf.id));
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
                await uploadManager.queueUpload(sanitizedFile, componentId, fieldName);
            } catch (error) {
                console.error('Failed to queue file for upload:', error);
                const errorMsg = `Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                showTemporaryError(errorMsg);
            }
        }
    }, [fieldName, componentId, field, currentValue.files.length, queuedFiles.length, uploadManager, showTemporaryError]);

    // Handle paste event from keyboard or programmatic trigger
    const handlePasteEvent = useCallback(async (e: ClipboardEvent) => {
        // Prevent double paste
        if (isPastingRef.current) {
            e.preventDefault();
            return;
        }

        e.preventDefault();
        isPastingRef.current = true;

        try {
            const items = e.clipboardData?.items;
            if (!items) {
                showTemporaryError('No clipboard data available');
                return;
            }

            let foundImage = false;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];

                // Check if item is an image file (including SVG)
                const isImageFile = item.type.startsWith('image/') ||
                    item.type === 'image/svg+xml' ||
                    item.type.includes('svg');

                if (isImageFile) {
                    foundImage = true;
                    const blob = item.getAsFile();

                    if (blob) {
                        // Create a file from the blob
                        let extension = item.type.split('/')[1] || 'png';
                        if (extension.includes('svg')) {
                            extension = 'svg';
                        }
                        const timestamp = Date.now();
                        const fileName = `clipboard-image-${timestamp}.${extension}`;

                        const file = new File([blob], fileName, { type: item.type });

                        // Use existing file selection handler
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        await handleFileSelect(dataTransfer.files);

                        break; // Only paste the first image
                    }
                }

                // Check if item is SVG text content
                if (item.type === 'text/plain' || item.type === 'text/html') {
                    const text = await new Promise<string>((resolve) => {
                        item.getAsString(resolve);
                    });

                    // Check if the text content is SVG
                    if (text.trim().startsWith('<svg') && text.includes('</svg>')) {
                        foundImage = true;

                        // Create a blob from the SVG text
                        const blob = new Blob([text], { type: 'image/svg+xml' });
                        const timestamp = Date.now();
                        const fileName = `clipboard-svg-${timestamp}.svg`;

                        const file = new File([blob], fileName, { type: 'image/svg+xml' });

                        // Use existing file selection handler
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        await handleFileSelect(dataTransfer.files);

                        break; // Only paste the first image
                    }
                }
            }

            if (!foundImage) {
                showTemporaryError('No image or SVG found in clipboard. Please copy an image first.');
            }
        } finally {
            // Reset the flag after a short delay
            setTimeout(() => {
                isPastingRef.current = false;
            }, 100);
        }
    }, [handleFileSelect, showTemporaryError]);

    // Add global paste listener when hovering
    useEffect(() => {
        if (!isHovering) return;

        const handleGlobalPaste = (e: ClipboardEvent) => {
            handlePasteEvent(e);
        };

        window.addEventListener('paste', handleGlobalPaste);

        return () => {
            window.removeEventListener('paste', handleGlobalPaste);
        };
    }, [isHovering, handlePasteEvent]);

    // Handle paste button click - programmatically trigger paste
    const handlePasteFromClipboard = useCallback(async () => {
        if (!pasteTargetRef.current) return;

        pasteTargetRef.current.focus();

        try {
            if (navigator.clipboard && navigator.clipboard.readText) {
                const text = await navigator.clipboard.readText();

                // Check if the text content is SVG
                if (text.trim().startsWith('<svg') && text.includes('</svg>')) {
                    const blob = new Blob([text], { type: 'image/svg+xml' });
                    const timestamp = Date.now();
                    const fileName = `clipboard-svg-${timestamp}.svg`;

                    const file = new File([blob], fileName, { type: 'image/svg+xml' });

                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    await handleFileSelect(dataTransfer.files);
                    return;
                }
            }

            // Try reading as image blob
            if (navigator.clipboard && navigator.clipboard.read) {
                const clipboardItems = await navigator.clipboard.read();

                for (const item of clipboardItems) {
                    const imageTypes = item.types.filter(type =>
                        type.startsWith('image/') || type === 'image/svg+xml'
                    );

                    if (imageTypes.length > 0) {
                        const imageType = imageTypes[0];
                        const blob = await item.getType(imageType);

                        const extension = imageType.split('/')[1] || 'png';
                        const timestamp = Date.now();
                        const fileName = `clipboard-image-${timestamp}.${extension}`;

                        const file = new File([blob], fileName, { type: imageType });

                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        await handleFileSelect(dataTransfer.files);
                        return;
                    }
                }
            }

            showTemporaryError('No image or SVG found in clipboard. Please copy an image first.');
        } catch (error) {
            showTemporaryError('Please press Ctrl+V (or Cmd+V) to paste, or grant clipboard permission');
        }
    }, [handleFileSelect, showTemporaryError]);

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

    // Handle mouse enter/leave for hover detection
    const handleMouseEnter = useCallback(() => {
        setIsHovering(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsHovering(false);
    }, []);

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
            // Queue file for deletion
            uploadManager.queueDeletion(fileToRemove.url, componentData?.id, field.name);

            // Remove from current value immediately for UI feedback
            const newFiles = [...currentValue.files];
            newFiles.splice(index, 1);
            const newValue = { files: newFiles };
            onChange(newValue);
        }
    }, [currentValue.files, onChange, uploadManager, componentData?.id, field.name]);

    // Remove all files for this field only
    const removeAllFiles = useCallback(() => {
        // Clear all queued files for this field
        queuedFiles.forEach(qf => removeQueuedFile(qf.id));

        // Queue deletion for all currently uploaded files
        currentValue.files.forEach(file => {
            uploadManager.queueDeletion(file.url, componentData?.id, field.name);
        });

        // Clear value for immediate UI feedback
        onChange({ files: [] });
    }, [queuedFiles, removeQueuedFile, currentValue.files, uploadManager, componentData?.id, field.name, onChange]);

    // Handle SVG edit
    const handleEditSvg = useCallback((index: number) => {
        setEditingSvgIndex(index);
        setSvgEditorOpen(true);
    }, []);



    // Handle queued SVG edit
    const handleEditQueuedSvg = useCallback((fileId: string) => {
        setEditingQueuedSvgId(fileId);
        setSvgEditorOpen(true);
    }, []);

    // Handle SVG save (unified for both uploaded and queued)
    const handleSaveSvgUnified = useCallback(async (newSvgContent: string) => {
        try {
            const blob = new Blob([newSvgContent], { type: 'image/svg+xml' });

            if (editingSvgIndex !== null) {
                // Editing uploaded file
                const fileToEdit = currentValue.files[editingSvgIndex];
                if (!fileToEdit) return;

                const file = new File([blob], fileToEdit.name, { type: 'image/svg+xml' });
                await uploadManager.queueUpload(file, componentData?.id, field.name);
                uploadManager.queueDeletion(fileToEdit.url, componentData?.id, field.name);

                const newFiles = [...currentValue.files];
                newFiles.splice(editingSvgIndex, 1);
                onChange({ files: newFiles });
            } else if (editingQueuedSvgId) {
                // Editing queued file
                const queuedFile = queuedFiles.find(qf => qf.id === editingQueuedSvgId);
                if (!queuedFile) return;

                const newFile = new File([blob], queuedFile.file.name, { type: 'image/svg+xml' });
                uploadManager.removeOperation(editingQueuedSvgId);
                await uploadManager.queueUpload(newFile, componentData?.id, field.name);
            }

            // Clear editing state immediately after successful save
            setSvgEditorOpen(false);
            setEditingSvgIndex(null);
            setEditingQueuedSvgId(null);
        } catch (error) {
            console.error('Failed to save SVG:', error);
            throw error;
        }
    }, [editingSvgIndex, editingQueuedSvgId, currentValue.files, queuedFiles, uploadManager, onChange, componentData?.id, field.name]);

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

    // Determine the effective variant to use
    // If no variant is specified and field is in single mode (not multiple), use inline variant
    const isSingleMode = !field.multiple && (field.maxFiles === 1 || !field.maxFiles);
    const effectiveVariant = field.variant || (isSingleMode ? 'inline' : 'list');

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
                    multiple={field.multiple ?? false}
                    onChange={handleInputChange}
                    className="sr-only"
                    aria-label="Upload files"
                />

                {/* Hidden paste target - contenteditable to receive paste events */}
                <div
                    ref={pasteTargetRef}
                    contentEditable
                    onPaste={(e) => handlePasteEvent(e.nativeEvent)}
                    className="sr-only"
                    aria-hidden="true"
                    suppressContentEditableWarning
                    style={{ position: 'absolute', left: '-9999px' }}
                />

                {/* Inline variant - shows file in upload area (auto-enabled for single mode) */}
                {effectiveVariant === 'inline' ? (
                    <>
                        <InlineVariant
                            uploadedFiles={currentValue.files}
                            queuedFiles={queuedFiles}
                            inlineConfig={field.inlineConfig}
                            onRemoveUploaded={removeUploadedFile}
                            onRemoveQueued={removeQueuedFile}
                            onEditSvg={handleEditSvg}
                            onEditQueuedSvg={handleEditQueuedSvg}
                            onSelectClick={() => fileInputRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragEnter={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            onPasteFromClipboard={handlePasteFromClipboard}
                        />
                    </>
                ) : (
                    <>
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
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            onPasteFromClipboard={handlePasteFromClipboard}
                        />

                        {/* File list */}
                        {hasFiles && (
                            <FileUploadList
                                uploadedFiles={currentValue.files}
                                queuedFiles={queuedFiles}
                                zoomMargin={zoomMargin}
                                variant={effectiveVariant as 'list' | 'grid'}
                                onRemoveUploaded={removeUploadedFile}
                                onRemoveQueued={removeQueuedFile}
                                onRemoveAll={removeAllFiles}
                                onEditSvg={handleEditSvg}
                                onEditQueuedSvg={handleEditQueuedSvg}
                            />
                        )}
                    </>
                )}

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

                {/* SVG Editor Modal (unified for both uploaded and queued files) */}
                <SvgEditorModal
                    isOpen={svgEditorOpen}
                    onClose={() => {
                        setSvgEditorOpen(false);
                        setEditingSvgIndex(null);
                        setEditingQueuedSvgId(null);
                    }}
                    svgUrl={editingSvgIndex !== null ? currentValue.files[editingSvgIndex]?.url : undefined}
                    svgFile={editingQueuedSvgId !== null ? queuedFiles.find(qf => qf.id === editingQueuedSvgId)?.file : undefined}
                    fileName={
                        editingSvgIndex !== null
                            ? currentValue.files[editingSvgIndex]?.name || 'Unknown'
                            : queuedFiles.find(qf => qf.id === editingQueuedSvgId)?.file.name || 'Unknown'
                    }
                    onSave={handleSaveSvgUnified}
                />
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
