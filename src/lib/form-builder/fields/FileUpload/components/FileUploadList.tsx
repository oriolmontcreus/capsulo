import React from 'react';
import type { QueuedFile, FileUploadVariant } from '../fileUpload.types';
import { ListVariant } from '../variants/list';
import { GridVariant } from '../variants/grid';

interface FileUploadListProps {
    uploadedFiles: Array<{
        url: string;
        name: string;
        size: number;
        type: string;
    }>;
    queuedFiles: QueuedFile[];
    zoomMargin: number;
    variant?: FileUploadVariant;
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
    variant = 'list',
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

    // Common props for all variants
    const commonProps = {
        uploadedFiles,
        queuedFiles,
        zoomMargin,
        onRemoveUploaded,
        onRemoveQueued,
        onRemoveAll,
        onEditSvg,
        onEditQueuedSvg
    };

    // Render the appropriate variant
    switch (variant) {
        case 'grid':
            return <GridVariant {...commonProps} />;
        case 'list':
        default:
            return <ListVariant {...commonProps} />;
    }
};
