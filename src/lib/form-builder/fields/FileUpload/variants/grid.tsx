import React from 'react';
import { Button } from '@/components/ui/button';
import type { QueuedFile } from '../fileUpload.types';
import { UploadedFileGridItem, QueuedFileGridItem } from '../components/FileUploadGridItems';

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
                        onRemove={() => onRemoveUploaded(index)}
                        onEditSvg={onEditSvg ? () => onEditSvg(index) : undefined}
                    />
                ))}

                {/* Queued files */}
                {queuedFiles.map((queuedFile) => (
                    <QueuedFileGridItem
                        key={queuedFile.id}
                        queuedFile={queuedFile}
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
