import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface FileUploadErrorProps {
    message: string;
    onDismiss: () => void;
}

export const FileUploadError: React.FC<FileUploadErrorProps> = ({ message, onDismiss }) => {
    return (
        <div
            className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-2 duration-300"
            role="alert"
        >
            <AlertCircle className="size-4 shrink-0" />
            <span className="flex-1">{message}</span>
            <button
                type="button"
                onClick={onDismiss}
                className="shrink-0 rounded p-1 hover:bg-destructive/20 transition-colors"
                aria-label="Dismiss error"
            >
                <X className="size-3" />
            </button>
        </div>
    );
};
