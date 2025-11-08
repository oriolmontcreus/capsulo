import React from 'react';
import { Button } from '@/components/ui/button';
import { UploadedFileItem, QueuedFileItem } from './FileUploadItem';
import type { QueuedFile } from '../fileUpload.types';

interface FileUploadListProps {
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

export const FileUploadList: React.FC<FileUploadListProps> = ({
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
        <div className="space-y-2">
            {/* Uploaded files */}
            {uploadedFiles.map((file, index) => (
                <UploadedFileItem
                    key={`uploaded-${index}`}
                    file={file}
                    zoomMargin={zoomMargin}
                    onRemove={() => onRemoveUploaded(index)}
                    onEditSvg={onEditSvg ? () => onEditSvg(index) : undefined}
                />
            ))}

            {/* Queued files */}
            {queuedFiles.map((queuedFile) => (
                <QueuedFileItem
                    key={queuedFile.id}
                    queuedFile={queuedFile}
                    zoomMargin={zoomMargin}
                    onRemove={() => onRemoveQueued(queuedFile.id)}
                    onEditSvg={onEditQueuedSvg ? () => onEditQueuedSvg(queuedFile.id) : undefined}
                />
            ))}

            {/* Remove all files button */}
            {totalFiles > 1 && (
                <div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={onRemoveAll}
                        type="button"
                    >
                        Remove all files
                    </Button>
                </div>
            )}
        </div>
    );
};
