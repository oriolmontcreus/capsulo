export interface FileUploadConfig {
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    endpoint?: string;
}

export interface ImageOptimizationConfig {
    enableWebPConversion: boolean;
    quality: number; // 0-100, default 85
    maxWidth?: number; // default 1920
    maxHeight?: number; // default 1080
    supportedFormats: string[]; // ['image/jpeg', 'image/png']
}

export interface QueuedFile {
    id: string;
    file: File;
    status: 'pending' | 'optimizing' | 'uploading' | 'uploaded' | 'error';
    preview?: string;
    error?: string;
}

export interface FileUploadValue {
    files: Array<{
        url: string;
        name: string;
        size: number;
        type: string;
    }>;
    // Temporary flags for tracking pending uploads (not saved to storage)
    _hasPendingUploads?: boolean;
    _queuedCount?: number;
}

export type FileUploadVariant = 'list' | 'grid';

export interface FileUploadField {
    type: 'fileUpload';
    name: string;
    label?: string;
    description?: string;
    required?: boolean;
    defaultValue?: FileUploadValue;
    // File validation options
    accept?: string; // MIME types or file extensions
    maxSize?: number; // Maximum file size in bytes
    maxFiles?: number; // Maximum number of files
    multiple?: boolean; // Allow multiple file selection
    // Display variant
    variant?: FileUploadVariant;
    // R2 configuration
    r2Config?: FileUploadConfig;
    // Image optimization settings
    imageOptimization?: ImageOptimizationConfig;
}