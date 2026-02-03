import React from 'react';
import { X, Loader2, AlertCircle, Image, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageZoom } from '@/components/ui/image-zoom';
import { cn } from '@/lib/utils';
import { formatFileSize } from '../fileUpload.utils';
import type { QueuedFile } from '../fileUpload.types';
import { getFileIcon, isPreviewable, isSVG, handleFilePreview } from './FileUploadItemShared';

interface UploadedFileGridItemProps {
    file: {
        url: string;
        name: string;
        size: number;
        type: string;
    };
    onRemove: () => void;
    onEditSvg?: () => void;
}

export const UploadedFileGridItem: React.FC<UploadedFileGridItemProps> = ({ file, onRemove, onEditSvg }) => {
    const isImage = file.type.startsWith('image/');
    const canPreview = isPreviewable(file);
    const showHover = canPreview || isImage;
    const isSvg = isSVG(file);

    return (
        <div className="relative group border rounded-lg overflow-hidden bg-background">
            {/* Preview/Thumbnail */}
            <div
                className={cn(
                    "aspect-square w-full bg-accent flex items-center justify-center relative",
                    showHover && "cursor-pointer dark:hover:bg-accent/80 hover:bg-neutral-300 transition-colors"
                )}
                onClick={canPreview && !isImage ? () => handleFilePreview(file.url) : undefined}
                title={canPreview && !isImage ? `Click to preview ${file.name}` : undefined}
            >
                {isImage ? (
                    <ImageZoom className="w-full h-full">
                        <img
                            src={file.url}
                            alt={file.name}
                            className="w-full h-full object-cover transition-all duration-200 group-hover:brightness-75"
                            loading="lazy"
                        />
                    </ImageZoom>
                ) : (
                    <div className="flex items-center justify-center">
                        {getFileIcon(file, 'size-12')}
                    </div>
                )}
            </div>

            {/* File Info */}
            <div className="p-2 flex flex-col gap-0.5">
                <p
                    className={cn(
                        "truncate text-xs font-medium",
                        canPreview && !isImage && "cursor-pointer hover:text-foreground/80 transition-colors"
                    )}
                    onClick={canPreview && !isImage ? () => handleFilePreview(file.url) : undefined}
                    title={file.name}
                >
                    {file.name}
                </p>
                <p className="text-[11px] text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>

            {/* Action buttons - shown on hover */}
            <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isSvg && onEditSvg && (
                    <Button
                        size="icon"
                        variant="secondary"
                        className="size-7 shadow-sm"
                        onClick={onEditSvg}
                        aria-label="Edit SVG"
                        type="button"
                        title="Edit SVG code"
                    >
                        <Edit className="size-3.5" aria-hidden="true" />
                    </Button>
                )}
                <Button
                    size="icon"
                    variant="secondary"
                    className="size-7 shadow-sm"
                    onClick={onRemove}
                    aria-label="Remove file"
                    type="button"
                >
                    <X className="size-3.5" aria-hidden="true" />
                </Button>
            </div>
        </div>
    );
};

interface QueuedFileGridItemProps {
    queuedFile: QueuedFile;
    onRemove: () => void;
    onEditSvg?: () => void;
}

export const QueuedFileGridItem: React.FC<QueuedFileGridItemProps> = ({ queuedFile, onRemove, onEditSvg }) => {
    const isImage = queuedFile.file.type.startsWith('image/');
    const canPreview = isPreviewable(queuedFile.file);
    const showHover = canPreview || isImage;
    const isSvg = isSVG(queuedFile.file);

    // Create a blob URL for preview if the file is previewable (non-image)
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (canPreview && !isImage && !queuedFile.preview) {
            const url = URL.createObjectURL(queuedFile.file);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [canPreview, isImage, queuedFile.file, queuedFile.preview]);

    const handlePreview = () => {
        if (!isImage) {
            const urlToOpen = queuedFile.preview || previewUrl;
            if (urlToOpen) handleFilePreview(urlToOpen);
        }
    };

    return (
        <div className="relative group border rounded-lg overflow-hidden bg-background">
            {/* Preview/Thumbnail */}
            <div
                className={cn(
                    "aspect-square w-full bg-accent flex items-center justify-center relative",
                    showHover && "cursor-pointer dark:hover:bg-accent/80 hover:bg-neutral-300 transition-colors"
                )}
                onClick={canPreview && !isImage ? handlePreview : undefined}
                title={canPreview && !isImage ? `Click to preview ${queuedFile.file.name}` : undefined}
            >
                {queuedFile.preview ? (
                    <ImageZoom className="w-full h-full">
                        <img
                            src={queuedFile.preview}
                            alt={queuedFile.file.name}
                            className="w-full h-full object-cover transition-all duration-200 group-hover:brightness-75"
                            loading="lazy"
                        />
                    </ImageZoom>
                ) : isImage ? (
                    <div className="flex items-center justify-center">
                        <Image className="size-12 text-muted-foreground" />
                    </div>
                ) : (
                    <div className="flex items-center justify-center">
                        {getFileIcon(queuedFile.file, 'size-12')}
                    </div>
                )}

                {/* Status overlay */}
                {queuedFile.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                        <Loader2 className="size-6 text-white animate-spin" />
                    </div>
                )}
                {queuedFile.status === 'error' && (
                    <div className="absolute inset-0 bg-destructive/50 flex items-center justify-center z-10">
                        <AlertCircle className="size-6 text-white" />
                    </div>
                )}
            </div>

            {/* File Info */}
            <div className="p-2 flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                    <p
                        className={cn(
                            "truncate text-xs font-medium flex-1",
                            canPreview && !isImage && "cursor-pointer hover:text-foreground/80 transition-colors"
                        )}
                        onClick={canPreview && !isImage ? handlePreview : undefined}
                        title={queuedFile.file.name}
                    >
                        {queuedFile.file.name}
                    </p>
                    {queuedFile.status === 'uploading' && (
                        <span className="text-[10px] text-muted-foreground shrink-0">Uploading...</span>
                    )}
                    {queuedFile.status === 'error' && (
                        <span className="text-[10px] text-destructive shrink-0">Error</span>
                    )}
                </div>
                <p className="text-[11px] text-muted-foreground">{formatFileSize(queuedFile.file.size)}</p>
                {queuedFile.error && (
                    <p className="text-[10px] text-destructive line-clamp-2">{queuedFile.error}</p>
                )}
            </div>

            {/* Action buttons - shown on hover */}
            <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isSvg && onEditSvg && (
                    <Button
                        size="icon"
                        variant="secondary"
                        className="size-7 shadow-sm"
                        onClick={onEditSvg}
                        aria-label="Edit SVG"
                        type="button"
                        title="Edit SVG code"
                    >
                        <Edit className="size-3.5" aria-hidden="true" />
                    </Button>
                )}
                <Button
                    size="icon"
                    variant="secondary"
                    className="size-7 shadow-sm"
                    onClick={onRemove}
                    aria-label="Remove file"
                    type="button"
                >
                    <X className="size-3.5" aria-hidden="true" />
                </Button>
            </div>
        </div>
    );
};
