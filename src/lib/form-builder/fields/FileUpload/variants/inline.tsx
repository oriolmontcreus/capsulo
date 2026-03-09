import React from 'react';
import { X, Loader2, AlertCircle, Upload, Edit, Clipboard, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageZoom } from '@/components/ui/image-zoom';
import { cn } from '@/lib/utils';
import { formatFileSize } from '../fileUpload.utils';
import type { QueuedFile, InlineConfig } from '../fileUpload.types';
import {
  getFileIcon,
  isSVG,
  isPreviewable,
  handleFilePreview,
} from '../components/FileUploadItemShared';
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
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onPasteFromClipboard?: () => void;
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
  onDragLeave,
  onMouseEnter,
  onMouseLeave,
  onPasteFromClipboard,
}) => {
  const [isDragOver, setIsDragOver] = React.useState(false);

  // Handle drag events
  const handleDragEnter = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
      onDragEnter?.(e);
    },
    [onDragEnter]
  );

  const handleDragLeave = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      // Only set isDragOver to false if we're actually leaving the container
      // (not just entering a child element)
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setIsDragOver(false);
      }
      onDragLeave?.(e);
    },
    [onDragLeave]
  );

  const handleDragOver = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      onDragOver?.(e);
    },
    [onDragOver]
  );

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      onDrop?.(e);
    },
    [onDrop]
  );
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
  const isActuallySvg =
    (uploadedFile && isSVG(uploadedFile)) || (queuedFile && isSVG(queuedFile.file));
  const effectiveAspectRatio =
    aspectRatio === 'auto' && isActuallySvg
      ? 'square' // Square for icons is better than video
      : aspectRatio === 'auto'
        ? getDefaultAspectRatio((uploadedFile || queuedFile?.file)?.type || '')
        : aspectRatio;

  const aspectRatioValue = getAspectRatioValue(effectiveAspectRatio);

  // Apply constraints to prevent excessive dimensions
  const useNaturalDimensions = aspectRatioValue === 'auto';
  const maxWidth = inlineConfig?.width ? inlineConfig.width : isActuallySvg ? '160px' : '600px';
  const containerWidth = useNaturalDimensions ? 'auto' : width; // For natural ratios, let content determine width
  const maxNaturalHeight =
    inlineConfig?.height && inlineConfig.height !== 'auto' ? inlineConfig.height : '500px';

  // Render uploaded file
  if (uploadedFile) {
    const isImage = uploadedFile.type.startsWith('image/');
    const canPreview = isPreviewable(uploadedFile);
    const isSvg = isSVG(uploadedFile);
    const isVideo = uploadedFile.type.startsWith('video/');
    const useNaturalRatio = aspectRatioValue === 'auto' && (isImage || isVideo) && !isSvg;

    return (
      <div
        className="relative border-2 border-dashed rounded-lg overflow-hidden bg-accent/30 transition-colors"
        style={{
          width: containerWidth,
          maxWidth,
          ...(useNaturalRatio
            ? {
                maxHeight: maxNaturalHeight, // Prevent images from being too tall
              }
            : {
                height: height === 'auto' && aspectRatioValue !== 'auto' ? undefined : height,
                aspectRatio: aspectRatioValue !== 'auto' ? aspectRatioValue : undefined,
              }),
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Wrapper with group - hover persists when moving between preview and buttons */}
        <div className="group relative w-full h-full">
          {/* File Preview */}
          <div
            className={cn(
              'w-full flex items-center justify-center relative bg-accent/30 group-hover:bg-accent/50 transition-colors',
              useNaturalRatio ? 'h-auto' : 'h-full',
              canPreview && !isImage && 'cursor-pointer'
            )}
            onClick={canPreview && !isImage ? () => handleFilePreview(uploadedFile.url) : undefined}
          >
            {isImage ? (
              <ImageZoom
                className={cn(
                  useNaturalRatio ? 'max-w-full' : 'w-full h-full flex items-center justify-center',
                  isSvg && 'p-4'
                )}
              >
                <img
                  src={uploadedFile.url}
                  alt={uploadedFile.name}
                  className={cn(
                    isSvg
                      ? 'size-16 object-contain'
                      : useNaturalRatio
                        ? 'max-w-full h-auto object-contain'
                        : 'w-full h-full object-cover'
                  )}
                  style={useNaturalRatio && !isSvg ? { maxHeight: maxNaturalHeight } : undefined}
                  loading="lazy"
                />
              </ImageZoom>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 p-4">
                {getFileIcon(uploadedFile, 'size-12')}
                <div className="text-center">
                  <p className="text-sm font-medium truncate max-w-[200px]">{uploadedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(uploadedFile.size)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

          {/* Delete button - top right */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="destructive"
              onClick={() => onRemoveUploaded(0)}
              type="button"
              className="size-8"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>

          {/* Edit/Replace buttons - bottom center */}
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
          </div>

          {/* File info badge (bottom) */}
          {isImage && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <p className="truncate">
                {uploadedFile.name} • {formatFileSize(uploadedFile.size)}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render queued file
  if (queuedFile) {
    const isImage = queuedFile.file.type.startsWith('image/');
    const isSvg = isSVG(queuedFile.file);
    const isVideo = queuedFile.file.type.startsWith('video/');
    const useNaturalRatio = aspectRatioValue === 'auto' && (isImage || isVideo) && !isSvg;

    return (
      <div
        className="relative border-2 border-dashed rounded-lg overflow-hidden bg-accent/30"
        style={{
          width: containerWidth,
          maxWidth,
          ...(useNaturalRatio
            ? {
                maxHeight: maxNaturalHeight, // Prevent images from being too tall
              }
            : {
                height: height === 'auto' && aspectRatioValue !== 'auto' ? undefined : height,
                aspectRatio: aspectRatioValue !== 'auto' ? aspectRatioValue : undefined,
              }),
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Wrapper with group - hover persists when moving between preview and buttons */}
        <div className="group relative w-full h-full">
          {/* File Preview */}
          <div
            className={cn(
              'w-full flex items-center justify-center relative',
              useNaturalRatio ? 'h-auto' : 'h-full'
            )}
          >
            {queuedFile.preview ? (
              <ImageZoom
                className={cn(
                  useNaturalRatio ? 'max-w-full' : 'w-full h-full flex items-center justify-center',
                  isSvg && 'p-4'
                )}
              >
                <img
                  src={queuedFile.preview}
                  alt={queuedFile.file.name}
                  className={cn(
                    isSvg
                      ? 'size-16 object-contain'
                      : useNaturalRatio
                        ? 'max-w-full h-auto object-contain'
                        : 'w-full h-full object-cover'
                  )}
                  style={useNaturalRatio && !isSvg ? { maxHeight: maxNaturalHeight } : undefined}
                  loading="lazy"
                />
              </ImageZoom>
            ) : isImage ? (
              <div className="flex flex-col items-center justify-center gap-2 p-4">
                <Upload className="size-12 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium truncate max-w-[200px]">
                    {queuedFile.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(queuedFile.file.size)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 p-4">
                {getFileIcon(queuedFile.file, 'size-12')}
                <div className="text-center">
                  <p className="text-sm font-medium truncate max-w-[200px]">
                    {queuedFile.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(queuedFile.file.size)}
                  </p>
                </div>
              </div>
            )}

            {/* Status Overlay */}
            {queuedFile.status === 'uploading' && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 text-white">
                <Loader2 className="size-8 animate-spin" />
                <span className="text-sm font-medium">Uploading...</span>
              </div>
            )}
            {queuedFile.status === 'error' && (
              <div className="absolute inset-0 bg-destructive/60 flex flex-col items-center justify-center gap-2 text-white">
                <AlertCircle className="size-8" />
                <span className="text-sm font-medium">Upload Failed</span>
                {queuedFile.error && <p className="text-xs px-4 text-center">{queuedFile.error}</p>}
              </div>
            )}
          </div>

          {/* Dark overlay (only when not uploading) */}
          {queuedFile.status !== 'uploading' && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          )}

          {/* Delete button - top right (only when not uploading) */}
          {queuedFile.status !== 'uploading' && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="destructive"
                onClick={() => onRemoveQueued(queuedFile.id)}
                type="button"
                className="size-8"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          )}

          {/* Edit button - bottom center (only when not uploading and no error) */}
          {queuedFile.status !== 'uploading' &&
            isSvg &&
            onEditQueuedSvg &&
            queuedFile.status !== 'error' && (
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
              </div>
            )}
        </div>
      </div>
    );
  }

  // Render empty state (drop zone) - styled to match FileUploadDropZone
  return (
    <div
      className={cn(
        'relative flex min-h-52 flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed p-4 transition-all duration-200 cursor-pointer bg-sidebar',
        isDragOver ? 'bg-brand/20 border-primary border-solid' : 'border-input'
      )}
      style={{
        width,
        maxWidth,
      }}
      onClick={onSelectClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
        <div
          className="mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-background"
          aria-hidden="true"
        >
          <Upload className="size-4 opacity-60" />
        </div>
        <p className="mb-1.5 text-sm font-medium">Drop your file here</p>
        <p className="text-xs text-muted-foreground">Click to upload or drag and drop</p>
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onSelectClick();
            }}
            type="button"
          >
            <Upload className="-ms-1 opacity-60" aria-hidden="true" />
            Select file
          </Button>

          {onPasteFromClipboard && (
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onPasteFromClipboard();
              }}
              type="button"
              aria-label="Paste from clipboard"
              title="Paste from clipboard"
            >
              <Clipboard className="size-4 opacity-60" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
