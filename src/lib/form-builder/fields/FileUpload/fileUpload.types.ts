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
    status: 'pending' | 'uploading' | 'uploaded' | 'error';
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

export type FileUploadVariant = 'list' | 'grid' | 'inline';

export type AspectRatio = 'square' | 'video' | 'wide' | 'portrait' | 'auto' | string;

export interface InlineConfig {
    aspectRatio?: AspectRatio; // 'square' (1:1), 'video' (16:9), 'wide' (21:9), 'portrait' (9:16), 'auto', or custom like '4:3'
    width?: string; // CSS width value, e.g., '100%', '300px', 'auto'
    height?: string; // CSS height value, e.g., 'auto', '200px'
}

export interface FileUploadField {
    type: 'fileUpload';
    name: string;
    label?: string;
    description?: string;
    required?: boolean | ((formData: any) => boolean);
    defaultValue?: FileUploadValue;
    // File validation options
    accept?: string; // MIME types or file extensions
    maxSize?: number; // Maximum file size in bytes
    maxFiles?: number; // Maximum number of files
    multiple?: boolean; // Allow multiple file selection
    // Display variant
    variant?: FileUploadVariant;
    // Inline variant configuration
    inlineConfig?: InlineConfig;
    // Image optimization settings
    imageOptimization?: ImageOptimizationConfig;
    // Table display control
    showInTable?: boolean; // Whether to show this field as a column in a repeater with table variant (default: true)
    hidden?: boolean | ((formData: any) => boolean);
}