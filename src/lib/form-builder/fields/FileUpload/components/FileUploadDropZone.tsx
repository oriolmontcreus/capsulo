import React from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface FileUploadDropZoneProps {
    isDragOver: boolean;
    hasFiles: boolean;
    canAddMore: boolean;
    isDisabled: boolean;
    displayError?: string;
    formatsDisplay: string | { display: string; allFormats: string[] };
    maxSize?: number;
    maxFiles?: number;
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onSelectClick: () => void;
    systemErrors: string[];
}

export const FileUploadDropZone: React.FC<FileUploadDropZoneProps> = ({
    isDragOver,
    hasFiles,
    canAddMore,
    isDisabled,
    displayError,
    formatsDisplay,
    maxSize,
    maxFiles,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop,
    onSelectClick,
    systemErrors
}) => {
    return (
        <div
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
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
            {(maxSize || maxFiles) && (
                <div className="absolute top-3 right-3 text-xs text-muted-foreground flex flex-col items-end">
                    {maxSize && (
                        <span>{Math.round(maxSize / (1024 * 1024))}MB max</span>
                    )}
                    {maxFiles && (
                        <span>{maxFiles} files max</span>
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
                        onClick={onSelectClick}
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
                    Maximum number of files reached ({maxFiles})
                </p>
            )}
        </div>
    );
};
