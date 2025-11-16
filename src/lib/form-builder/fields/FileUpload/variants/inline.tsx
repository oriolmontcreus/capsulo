import React from 'react';
import { X, Loader2, AlertCircle, Upload, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageZoom } from '@/components/ui/image-zoom';
import { cn } from '@/lib/utils';
import { formatFileSize } from '../fileUpload.utils';
import type { QueuedFile, InlineConfig } from '../fileUpload.types';
import { getFileIcon, isSVG, isPreviewable, handleFilePreview } from '../components/FileUploadItemShared';
import { getAspectRatioValue, getDefaultAspectRatio } from '../components/aspectRatioUtils';

interface InlineVariantProps {
    uploadedFiles: Array<{
        url: string;
        name: string;
        size: number;
        type: string;
    }>;
    queuedFiles: QueuedFile[];
    inlineConfig?: InlineConfig;
    onRemoveUploaded: (index: number) => void;
    onRemoveQueued: (fileId: string) => void;
    onEditSvg?: (index: number) => void;
    onEditQueuedSvg?: (fileId: string) => void;
    onSelectClick: () => void;
    onDrop?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDragEnter?: (e: React.DragEvent) => void;
    onDragLeave?: (e: React.DragEvent) => void;
}

export const InlineVariant: React.FC<InlineVariantProps> = ({
    uploadedFiles,
    queuedFiles,
    inlineConfig,
    onRemoveUploaded,
    onRemoveQueued,
    onEditSvg,
    onEditQueuedSvg,
    onSelectClick,
    onDrop,
    onDragOver,
    onDragEnter,
    onDragLeave
}) => {
    const [isDragOver, setIsDragOver] = React.useState(false);

    // Handle drag events
    const handleDragEnter = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
        onDragEnter?.(e);
    }, [onDragEnter]);

    const handleDragLeave = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        onDragLeave?.(e);
    }, [onDragLeave]);

    const handleDragOver = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        onDragOver?.(e);
    }, [onDragOver]);

    const handleDrop = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        onDrop?.(e);
    }, [onDrop]);
    // Get the single file (uploaded or queued)
    const uploadedFile = uploadedFiles[0];
    const queuedFile = queuedFiles[0];
    const hasFile = uploadedFile || queuedFile;

    // Get aspect ratio configuration with smart defaults
    // If user hasn't specified an aspect ratio:
    // - Empty state: use 16:9 for nice drop zone proportions
    // - With file: use 'auto' to preserve the file's natural aspect ratio
    const configuredAspectRatio = inlineConfig?.aspectRatio;
    const aspectRatio = configuredAspectRatio || (hasFile ? 'auto' : 'video');
    const width = inlineConfig?.width || '100%';
    const height = inlineConfig?.height || 'auto';

    // Determine actual aspect ratio to use
    const effectiveAspectRatio = aspectRatio === 'auto'
        ? getDefaultAspectRatio((uploadedFile || queuedFile?.file)?.type || '')
        : aspectRatio;

    const aspectRatioValue = getAspectRatioValue(effectiveAspectRatio);

    // Apply constraints to prevent excessive height
    const maxWidth = inlineConfig?.width ? undefined : '600px'; // Limit width when using default 100%

    // Render uploaded file
    if (uploadedFile) {
        const isImage = uploadedFile.type.startsWith('image/');
        const canPreview = isPreviewable(uploadedFile);
        const isSvg = isSVG(uploadedFile);
        const isVideo = uploadedFile.type.startsWith('video/');
        const useNaturalRatio = aspectRatioValue === 'auto' && (isImage || isVideo);

        return (
            <div
                className="relative border-2 border-dashed rounded-lg overflow-hidden bg-accent/30 hover:bg-accent/50 transition-colors group"
                style={{
                    width,
                    maxWidth,
                    ...(useNaturalRatio ? {
                        maxHeight: '500px', // Prevent images from being too tall
                    } : {
                        height: height === 'auto' && aspectRatioValue !== 'auto' ? undefined : height,
                        aspectRatio: aspectRatioValue !== 'auto' ? aspectRatioValue : undefined,
                    }),
                }}
            >
                {/* File Preview */}
                <div
                    className={cn(
                        "w-full flex items-center justify-center relative",
                        useNaturalRatio ? "h-auto" : "h-full",
                        canPreview && !isImage && "cursor-pointer"
                    )}
                    onClick={canPreview && !isImage ? () => handleFilePreview(uploadedFile.url) : undefined}
                >
                    {isImage ? (
                        <ImageZoom className="w-full">
                            <img
                                src={uploadedFile.url}
                                alt={uploadedFile.name}
                                className={cn(
                                    "w-full",
                                    useNaturalRatio ? "h-auto max-h-[500px] object-contain" : "h-full object-cover"
                                )}
                                loading="lazy"
                            />
                        </ImageZoom>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 p-4">
                            {getFileIcon(uploadedFile, 'size-12')}
                            <div className="text-center">
                                <p className="text-sm font-medium truncate max-w-[200px]">{uploadedFile.name}</p>
                                <p className="text-xs text-muted-foreground">{formatFileSize(uploadedFile.size)}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {isSvg && onEditSvg && (
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onEditSvg(0)}
                            type="button"
                            className="gap-2"
                        >
                            <Edit className="size-4" />
                            Edit SVG
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onSelectClick()}
                        type="button"
                        className="gap-2"
                    >
                        <Upload className="size-4" />
                        Replace
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onRemoveUploaded(0)}
                        type="button"
                        className="gap-2"
                    >
                        <X className="size-4" />
                        Remove
                    </Button>
                </div>

                {/* File info badge (bottom) */}
                {isImage && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="truncate">{uploadedFile.name} • {formatFileSize(uploadedFile.size)}</p>
                    </div>
                )}
            </div>
        );
    }

    // Render queued file
    if (queuedFile) {
        const isImage = queuedFile.file.type.startsWith('image/');
        const isSvg = isSVG(queuedFile.file);
        const isVideo = queuedFile.file.type.startsWith('video/');
        const useNaturalRatio = aspectRatioValue === 'auto' && (isImage || isVideo);

        return (
            <div
                className="relative border-2 border-dashed rounded-lg overflow-hidden bg-accent/30 group"
                style={{
                    width,
                    maxWidth,
                    ...(useNaturalRatio ? {
                        maxHeight: '500px', // Prevent images from being too tall
                    } : {
                        height: height === 'auto' && aspectRatioValue !== 'auto' ? undefined : height,
                        aspectRatio: aspectRatioValue !== 'auto' ? aspectRatioValue : undefined,
                    }),
                }}
            >
                {/* File Preview */}
                <div className={cn(
                    "w-full flex items-center justify-center relative",
                    useNaturalRatio ? "h-auto" : "h-full"
                )}>
                    {queuedFile.preview ? (
                        <ImageZoom className="w-full">
                            <img
                                src={queuedFile.preview}
                                alt={queuedFile.file.name}
                                className={cn(
                                    "w-full",
                                    useNaturalRatio ? "h-auto max-h-[500px] object-contain" : "h-full object-cover"
                                )}
                                loading="lazy"
                            />
                        </ImageZoom>
                    ) : isImage ? (
                        <div className="flex flex-col items-center justify-center gap-2 p-4">
                            <Upload className="size-12 text-muted-foreground" />
                            <div className="text-center">
                                <p className="text-sm font-medium truncate max-w-[200px]">{queuedFile.file.name}</p>
                                <p className="text-xs text-muted-foreground">{formatFileSize(queuedFile.file.size)}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 p-4">
                            {getFileIcon(queuedFile.file, 'size-12')}
                            <div className="text-center">
                                <p className="text-sm font-medium truncate max-w-[200px]">{queuedFile.file.name}</p>
                                <p className="text-xs text-muted-foreground">{formatFileSize(queuedFile.file.size)}</p>
                            </div>
                        </div>
                    )}

                    {/* Status Overlay */}
                    {(queuedFile.status === 'optimizing' || queuedFile.status === 'uploading') && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 text-white">
                            <Loader2 className="size-8 animate-spin" />
                            <span className="text-sm font-medium">
                                {queuedFile.status === 'optimizing' ? 'Optimizing...' : 'Uploading...'}
                            </span>
                        </div>
                    )}
                    {queuedFile.status === 'error' && (
                        <div className="absolute inset-0 bg-destructive/60 flex flex-col items-center justify-center gap-2 text-white">
                            <AlertCircle className="size-8" />
                            <span className="text-sm font-medium">Upload Failed</span>
                            {queuedFile.error && (
                                <p className="text-xs px-4 text-center">{queuedFile.error}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Action Buttons Overlay (only when not uploading) */}
                {queuedFile.status !== 'optimizing' && queuedFile.status !== 'uploading' && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {isSvg && onEditQueuedSvg && queuedFile.status !== 'error' && (
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => onEditQueuedSvg(queuedFile.id)}
                                type="button"
                                className="gap-2"
                            >
                                <Edit className="size-4" />
                                Edit SVG
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onRemoveQueued(queuedFile.id)}
                            type="button"
                            className="gap-2"
                        >
                            <X className="size-4" />
                            Remove
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    // Render empty state (drop zone)
    return (
        <div
            className={cn(
                "relative border-2 border-dashed rounded-lg overflow-hidden cursor-pointer group transition-colors",
                isDragOver
                    ? "bg-primary/10 border-primary"
                    : "bg-accent/10 hover:bg-accent/20 border-border"
            )}
            style={{
                width,
                maxWidth,
                height: height === 'auto' && aspectRatioValue !== 'auto' ? undefined : height,
                aspectRatio: aspectRatioValue !== 'auto' ? aspectRatioValue : undefined,
            }}
            onClick={onSelectClick}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-muted-foreground group-hover:text-foreground transition-colors">
                <Upload className="size-8" />
                <div className="text-center">
                    <p className="text-sm font-medium">
                        {isDragOver ? 'Drop file here' : 'Click to upload'}
                    </p>
                    <p className="text-xs">or drag and drop</p>
                </div>
            </div>
        </div>
    );
};
