import React from 'react';
import { X, Loader2, AlertCircle, Image, FileText, FileArchive, FileSpreadsheet, Video, Headphones, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageZoom } from '@/components/ui/image-zoom';
import { cn } from '@/lib/utils';
import { formatFileSize } from '../fileUpload.utils';
import type { QueuedFile } from '../fileUpload.types';

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

// Helper function to check if a file is audio
const isAudio = (file: { type: string; name: string }) => {
    return file.type.startsWith('audio/') ||
        file.name.toLowerCase().endsWith('.mp3') ||
        file.name.toLowerCase().endsWith('.wav') ||
        file.name.toLowerCase().endsWith('.ogg') ||
        file.name.toLowerCase().endsWith('.m4a') ||
        file.name.toLowerCase().endsWith('.flac');
};

// Helper function to check if a file is video
const isVideo = (file: { type: string; name: string }) => {
    return file.type.startsWith('video/') ||
        file.name.toLowerCase().endsWith('.mp4') ||
        file.name.toLowerCase().endsWith('.webm') ||
        file.name.toLowerCase().endsWith('.mov') ||
        file.name.toLowerCase().endsWith('.avi');
};

// Helper function to check if a file is previewable (PDF, audio, or video)
const isPreviewable = (file: { type: string; name: string }) => {
    return isPDF(file) || isAudio(file) || isVideo(file);
};

// Helper function to handle file preview
const handleFilePreview = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
};

interface UploadedFileItemProps {
    file: {
        url: string;
        name: string;
        size: number;
        type: string;
    };
    zoomMargin: number;
    onRemove: () => void;
}

export const UploadedFileItem: React.FC<UploadedFileItemProps> = ({ file, zoomMargin, onRemove }) => {
    const isImage = file.type.startsWith('image/');
    const canPreview = isPreviewable(file);
    const showHover = canPreview || isImage;

    return (
        <div className="flex items-center justify-between gap-2 border-t border-b p-2 pe-3">
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
    );
};

interface QueuedFileItemProps {
    queuedFile: QueuedFile;
    zoomMargin: number;
    onRemove: () => void;
}

export const QueuedFileItem: React.FC<QueuedFileItemProps> = ({ queuedFile, zoomMargin, onRemove }) => {
    const isImage = queuedFile.file.type.startsWith('image/');
    const canPreview = isPreviewable(queuedFile.file);
    const showHover = canPreview || isImage;

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
        <div className="flex items-center justify-between gap-2 border-t border-b p-2 pe-3">
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
                onClick={onRemove}
                aria-label="Remove file"
                type="button"
            >
                <X aria-hidden="true" />
            </Button>
        </div>
    );
};
