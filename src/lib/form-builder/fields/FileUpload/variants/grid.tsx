import React from 'react';
import { X, Loader2, AlertCircle, Image, FileText, FileArchive, FileSpreadsheet, Video, Headphones, File, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageZoom } from '@/components/ui/image-zoom';
import { cn } from '@/lib/utils';
import { formatFileSize } from '../fileUpload.utils';
import type { QueuedFile } from '../fileUpload.types';

// Helper function to get appropriate file icon based on file type
const getFileIcon = (file: { type: string; name: string }, size: string = 'size-8') => {
    const fileType = file.type;
    const fileName = file.name;

    if (fileType.includes("pdf") ||
        fileName.endsWith(".pdf") ||
        fileType.includes("word") ||
        fileName.endsWith(".doc") ||
        fileName.endsWith(".docx")) {
        return <FileText className={`${size} opacity-60`} />;
    } else if (fileType.includes("zip") ||
        fileType.includes("archive") ||
        fileName.endsWith(".zip") ||
        fileName.endsWith(".rar")) {
        return <FileArchive className={`${size} opacity-60`} />;
    } else if (fileType.includes("excel") ||
        fileType.includes("spreadsheet") ||
        fileName.endsWith(".xls") ||
        fileName.endsWith(".xlsx")) {
        return <FileSpreadsheet className={`${size} opacity-60`} />;
    } else if (fileType.includes("video/")) {
        return <Video className={`${size} opacity-60`} />;
    } else if (fileType.includes("audio/")) {
        return <Headphones className={`${size} opacity-60`} />;
    } else if (fileType.startsWith("image/")) {
        return <Image className={`${size} opacity-60`} />;
    }

    return <File className={`${size} opacity-60`} />;
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

// Helper function to check if a file is SVG
const isSVG = (file: { type: string; name: string }) => {
    return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
};

// Helper function to handle file preview
const handleFilePreview = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
};

interface UploadedFileGridItemProps {
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

const UploadedFileGridItem: React.FC<UploadedFileGridItemProps> = ({ file, zoomMargin, onRemove, onEditSvg }) => {
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
    zoomMargin: number;
    onRemove: () => void;
    onEditSvg?: () => void;
}

const QueuedFileGridItem: React.FC<QueuedFileGridItemProps> = ({ queuedFile, zoomMargin, onRemove, onEditSvg }) => {
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
                ) : queuedFile.file.type.startsWith('image/') ? (
                    <div className="flex items-center justify-center">
                        <Image className="size-12 text-muted-foreground" />
                    </div>
                ) : (
                    <div className="flex items-center justify-center">
                        {getFileIcon(queuedFile.file, 'size-12')}
                    </div>
                )}
                {/* Status overlay */}
                {(queuedFile.status === 'optimizing' || queuedFile.status === 'uploading') && (
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
                    {queuedFile.status === 'optimizing' && (
                        <span className="text-[10px] text-muted-foreground shrink-0">Optimizing...</span>
                    )}
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

interface GridVariantProps {
    uploadedFiles: Array<{
        url: string;
        name: string;
        size: number;
        type: string;
    }>;
    queuedFiles: QueuedFile[];
    zoomMargin: number;
    onRemoveUploaded: (index: number) => void;
    onRemoveQueued: (fileId: string) => void;
    onRemoveAll: () => void;
    onEditSvg?: (index: number) => void;
    onEditQueuedSvg?: (fileId: string) => void;
}

export const GridVariant: React.FC<GridVariantProps> = ({
    uploadedFiles,
    queuedFiles,
    zoomMargin,
    onRemoveUploaded,
    onRemoveQueued,
    onRemoveAll,
    onEditSvg,
    onEditQueuedSvg
}) => {
    const totalFiles = uploadedFiles.length + queuedFiles.length;

    if (totalFiles === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-3">
            {/* Grid of files */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {/* Uploaded files */}
                {uploadedFiles.map((file, index) => (
                    <UploadedFileGridItem
                        key={`uploaded-${index}`}
                        file={file}
                        zoomMargin={zoomMargin}
                        onRemove={() => onRemoveUploaded(index)}
                        onEditSvg={onEditSvg ? () => onEditSvg(index) : undefined}
                    />
                ))}

                {/* Queued files */}
                {queuedFiles.map((queuedFile) => (
                    <QueuedFileGridItem
                        key={queuedFile.id}
                        queuedFile={queuedFile}
                        zoomMargin={zoomMargin}
                        onRemove={() => onRemoveQueued(queuedFile.id)}
                        onEditSvg={onEditQueuedSvg ? () => onEditQueuedSvg(queuedFile.id) : undefined}
                    />
                ))}
            </div>

            {/* Remove all files button */}
            {totalFiles > 1 && (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={onRemoveAll}
                    type="button"
                >
                    Remove all files
                </Button>
            )}
        </div>
    );
};
