import React from 'react';
import { X, Loader2, AlertCircle, Image, FileText, FileArchive, FileSpreadsheet, Video, Headphones, File, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageZoom } from '@/components/ui/image-zoom';
import { cn } from '@/lib/utils';
import { formatFileSize } from '../fileUpload.utils';
import type { QueuedFile } from '../fileUpload.types';
import { getFileIcon, isPDF, isAudio, isVideo, isPreviewable, isSVG, handleFilePreview } from './FileUploadItemShared';

interface UploadedFileItemProps {
    file: {
        url: string;
        name: string;
        size: number;
        type: string;
    };
    zoomMargin: number;
    onRemove: () => void;
    onEditSvg?: () => void;
}

export const UploadedFileItem: React.FC<UploadedFileItemProps> = ({ file, zoomMargin, onRemove, onEditSvg }) => {
    const isImage = file.type.startsWith('image/');
    const canPreview = isPreviewable(file);
    const showHover = canPreview || isImage;
    const isSvg = isSVG(file);

    return (
        <div className="flex items-center justify-between border-b p-2 py-3">
            <div className="flex items-center gap-3 overflow-hidden">
                <div
                    className={cn(
                        "aspect-square shrink-0 rounded bg-accent group",
                        showHover && "cursor-pointer dark:hover:bg-accent/80 hover:bg-neutral-300 transition-colors"
                    )}
                    onClick={canPreview && !isImage ? () => handleFilePreview(file.url) : undefined}
                    title={canPreview && !isImage ? `Click to preview ${file.name}` : undefined}
                >
                    {isImage ? (
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
                            canPreview && !isImage && "cursor-pointer hover:text-foreground/80 transition-colors"
                        )}
                        onClick={canPreview && !isImage ? () => handleFilePreview(file.url) : undefined}
                        title={canPreview && !isImage ? `Click to preview ${file.name}` : undefined}
                    >
                        {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
            </div>
            <div className="flex items-center gap-1">
                {isSvg && onEditSvg && (
                    <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground/80 hover:text-foreground"
                        onClick={onEditSvg}
                        aria-label="Edit SVG"
                        type="button"
                        title="Edit SVG code"
                    >
                        <Edit className="size-4" aria-hidden="true" />
                    </Button>
                )}
                <Button
                    size="icon"
                    variant="ghost"
                    className="-me-2 size-8 text-muted-foreground/80 hover:text-foreground"
                    onClick={onRemove}
                    aria-label="Remove file"
                    type="button"
                >
                    <X aria-hidden="true" />
                </Button>
            </div>
        </div>
    );
};

interface QueuedFileItemProps {
    queuedFile: QueuedFile;
    zoomMargin: number;
    onRemove: () => void;
    onEditSvg?: () => void;
}

export const QueuedFileItem: React.FC<QueuedFileItemProps> = ({ queuedFile, zoomMargin, onRemove, onEditSvg }) => {
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

            // Cleanup blob URL when component unmounts
            return () => {
                URL.revokeObjectURL(url);
            };
        }
    }, [canPreview, isImage, queuedFile.file, queuedFile.preview]);

    const handlePreview = () => {
        if (!isImage) {
            const urlToOpen = queuedFile.preview || previewUrl;
            if (urlToOpen) {
                handleFilePreview(urlToOpen);
            }
        }
    };

    return (
        <div className="flex items-center justify-between border-b p-2">
            <div className="flex items-center gap-3 overflow-hidden">
                <div
                    className={cn(
                        "aspect-square shrink-0 rounded bg-accent relative group",
                        showHover && "cursor-pointer dark:hover:bg-accent/80 hover:bg-neutral-300 transition-colors"
                    )}
                    onClick={canPreview && !isImage ? handlePreview : undefined}
                    title={canPreview && !isImage ? `Click to preview ${queuedFile.file.name}` : undefined}
                >
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
                    {queuedFile.status === 'uploading' && (
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
                        <p
                            className={cn(
                                "truncate text-[13px] font-medium",
                                canPreview && !isImage && "cursor-pointer hover:text-foreground/80 transition-colors"
                            )}
                            onClick={canPreview && !isImage ? handlePreview : undefined}
                            title={canPreview && !isImage ? `Click to preview ${queuedFile.file.name}` : undefined}
                        >
                            {queuedFile.file.name}
                        </p>
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
            <div className="flex items-center gap-1">
                {isSvg && onEditSvg && (
                    <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground/80 hover:text-foreground"
                        onClick={onEditSvg}
                        aria-label="Edit SVG"
                        type="button"
                        title="Edit SVG code"
                    >
                        <Edit className="size-4" aria-hidden="true" />
                    </Button>
                )}
                <Button
                    size="icon"
                    variant="ghost"
                    className="-me-2 size-8 text-muted-foreground/80 hover:text-foreground"
                    onClick={onRemove}
                    aria-label="Remove file"
                    type="button"
                >
                    <X aria-hidden="true" />
                </Button>
            </div>
        </div>
    );
};
