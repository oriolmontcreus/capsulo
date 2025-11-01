import type { ImageOptimizationConfig, FileUploadField } from './fileUpload.types';

/**
 * File validation error types
 */
export interface FileValidationError {
    type: 'file-type' | 'file-size' | 'file-count' | 'filename' | 'mime-type';
    message: string;
    file?: File;
}

/**
 * File validation result
 */
export interface FileValidationResult {
    isValid: boolean;
    errors: FileValidationError[];
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
    accept?: string;
    maxSize?: number;
    maxFiles?: number;
    allowedMimeTypes?: string[];
    blockedExtensions?: string[];
    maxFilenameLength?: number;
}

/**
 * Default image optimization configuration
 */
export const DEFAULT_IMAGE_OPTIMIZATION: ImageOptimizationConfig = {
    enableWebPConversion: true,
    quality: 85,
    maxWidth: 1920,
    maxHeight: 1080,
    supportedFormats: ['image/jpeg', 'image/png']
};

/**
 * Check if a file is an image that can be optimized
 */
export function isOptimizableImage(file: File): boolean {
    return DEFAULT_IMAGE_OPTIMIZATION.supportedFormats.includes(file.type);
}

/**
 * Load an image file into an HTMLImageElement
 */
export function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(`Failed to load image: ${file.name}`));
        };

        img.src = url;
    });
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
export function calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth?: number,
    maxHeight?: number
): { width: number; height: number } {
    let { width, height } = { width: originalWidth, height: originalHeight };

    // Apply maximum width constraint
    if (maxWidth && width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
    }

    // Apply maximum height constraint
    if (maxHeight && height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
    }

    return { width: Math.round(width), height: Math.round(height) };
}

/**
 * Resize and convert image using canvas
 */
export function processImageWithCanvas(
    img: HTMLImageElement,
    targetWidth: number,
    targetHeight: number,
    quality: number = 0.85,
    outputFormat: string = 'image/webp'
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Failed to get canvas 2D context'));
                return;
            }

            // Set canvas dimensions
            canvas.width = targetWidth;
            canvas.height = targetHeight;

            // Enable image smoothing for better quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Draw the resized image
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            // Convert to blob with specified format and quality
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to convert canvas to blob'));
                    }
                },
                outputFormat,
                quality / 100 // Convert percentage to decimal
            );
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Convert image to WebP format with quality control
 */
export async function convertToWebP(
    file: File,
    config: Partial<ImageOptimizationConfig> = {}
): Promise<File> {
    const settings = { ...DEFAULT_IMAGE_OPTIMIZATION, ...config };

    // Check if WebP conversion is enabled and file is supported
    if (!settings.enableWebPConversion || !isOptimizableImage(file)) {
        return file;
    }

    try {
        // Load the image
        const img = await loadImage(file);

        // Calculate optimal dimensions
        const { width, height } = calculateOptimalDimensions(
            img.naturalWidth,
            img.naturalHeight,
            settings.maxWidth,
            settings.maxHeight
        );

        // Process the image
        const blob = await processImageWithCanvas(
            img,
            width,
            height,
            settings.quality,
            'image/webp'
        );

        // Create new file with WebP extension
        const originalName = file.name;
        const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
        const webpName = `${nameWithoutExt}.webp`;

        return new File([blob], webpName, {
            type: 'image/webp',
            lastModified: Date.now()
        });
    } catch (error) {
        console.warn(`WebP conversion failed for ${file.name}:`, error);
        // Return original file as fallback
        return file;
    }
}

/**
 * Resize image while maintaining aspect ratio
 */
export async function resizeImage(
    file: File,
    maxWidth?: number,
    maxHeight?: number,
    quality: number = 85
): Promise<File> {
    if (!isOptimizableImage(file)) {
        return file;
    }

    try {
        // Load the image
        const img = await loadImage(file);

        // Calculate optimal dimensions
        const { width, height } = calculateOptimalDimensions(
            img.naturalWidth,
            img.naturalHeight,
            maxWidth,
            maxHeight
        );

        // If no resizing is needed, return original file
        if (width === img.naturalWidth && height === img.naturalHeight) {
            return file;
        }

        // Process the image with original format
        const blob = await processImageWithCanvas(
            img,
            width,
            height,
            quality,
            file.type
        );

        return new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
        });
    } catch (error) {
        console.warn(`Image resizing failed for ${file.name}:`, error);
        // Return original file as fallback
        return file;
    }
}

/**
 * Get image dimensions without loading the full image
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({
                width: img.naturalWidth,
                height: img.naturalHeight
            });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(`Failed to get dimensions for: ${file.name}`));
        };

        img.src = url;
    });
}

/**
 * Check if browser supports WebP format
 */
export function supportsWebP(): Promise<boolean> {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;

        canvas.toBlob(
            (blob) => {
                resolve(blob !== null);
            },
            'image/webp'
        );
    });
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Calculate compression ratio as percentage
 */
export function calculateCompressionRatio(originalSize: number, optimizedSize: number): number {
    if (originalSize === 0) return 0;
    return Math.round(((originalSize - optimizedSize) / originalSize) * 100);
}

// ============================================================================
// FILE VALIDATION FUNCTIONS
// ============================================================================

/**
 * Common MIME type mappings for file extensions
 */
const MIME_TYPE_MAP: Record<string, string[]> = {
    // Images
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
    '.gif': ['image/gif'],
    '.webp': ['image/webp'],
    '.svg': ['image/svg+xml'],
    '.bmp': ['image/bmp'],
    '.ico': ['image/x-icon', 'image/vnd.microsoft.icon'],

    // Documents
    '.pdf': ['application/pdf'],
    '.doc': ['application/msword'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    '.xls': ['application/vnd.ms-excel'],
    '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    '.ppt': ['application/vnd.ms-powerpoint'],
    '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    '.txt': ['text/plain'],
    '.rtf': ['application/rtf', 'text/rtf'],
    '.csv': ['text/csv'],

    // Archives
    '.zip': ['application/zip'],
    '.rar': ['application/vnd.rar', 'application/x-rar-compressed'],
    '.7z': ['application/x-7z-compressed'],
    '.tar': ['application/x-tar'],
    '.gz': ['application/gzip'],

    // Audio
    '.mp3': ['audio/mpeg'],
    '.wav': ['audio/wav'],
    '.ogg': ['audio/ogg'],
    '.m4a': ['audio/mp4'],
    '.flac': ['audio/flac'],

    // Video
    '.mp4': ['video/mp4'],
    '.avi': ['video/x-msvideo'],
    '.mov': ['video/quicktime'],
    '.wmv': ['video/x-ms-wmv'],
    '.flv': ['video/x-flv'],
    '.webm': ['video/webm'],
    '.mkv': ['video/x-matroska']
};

/**
 * Potentially dangerous file extensions that should be blocked by default
 */
const DANGEROUS_EXTENSIONS = [
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
    '.app', '.deb', '.pkg', '.dmg', '.rpm', '.msi', '.run', '.bin'
];

/**
 * Sanitize filename by removing or replacing dangerous characters
 */
export function sanitizeFilename(filename: string): string {
    // Remove or replace dangerous characters
    let sanitized = filename
        // Remove null bytes and control characters
        .replace(/[\x00-\x1f\x80-\x9f]/g, '')
        // Replace path separators and other dangerous characters
        .replace(/[<>:"/\\|?*]/g, '_')
        // Remove leading/trailing dots and spaces
        .replace(/^[.\s]+|[.\s]+$/g, '')
        // Collapse multiple underscores
        .replace(/_+/g, '_')
        // Remove leading underscores
        .replace(/^_+/, '');

    // Ensure filename is not empty
    if (!sanitized) {
        sanitized = 'file';
    }

    // Limit filename length (keeping extension)
    const maxLength = 255;
    if (sanitized.length > maxLength) {
        const lastDotIndex = sanitized.lastIndexOf('.');
        if (lastDotIndex > 0) {
            const name = sanitized.substring(0, lastDotIndex);
            const extension = sanitized.substring(lastDotIndex);
            const maxNameLength = maxLength - extension.length;
            sanitized = name.substring(0, maxNameLength) + extension;
        } else {
            sanitized = sanitized.substring(0, maxLength);
        }
    }

    return sanitized;
}

/**
 * Get file extension from filename (including the dot)
 */
export function getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex >= 0 ? filename.substring(lastDotIndex).toLowerCase() : '';
}

/**
 * Check if file extension is potentially dangerous
 */
export function isDangerousExtension(filename: string): boolean {
    const extension = getFileExtension(filename);
    return DANGEROUS_EXTENSIONS.includes(extension);
}

/**
 * Validate MIME type against file extension
 */
export function validateMimeType(file: File): boolean {
    const extension = getFileExtension(file.name);
    const expectedMimeTypes = MIME_TYPE_MAP[extension];

    if (!expectedMimeTypes) {
        // Unknown extension, allow if MIME type seems reasonable
        return !file.type.includes('application/octet-stream') || file.type === '';
    }

    // Check if the file's MIME type matches expected types for this extension
    return expectedMimeTypes.includes(file.type);
}

/**
 * Parse accept attribute to get allowed file types
 */
export function parseAcceptAttribute(accept?: string): {
    mimeTypes: string[];
    extensions: string[];
} {
    if (!accept) {
        return { mimeTypes: [], extensions: [] };
    }

    const parts = accept.split(',').map(part => part.trim());
    const mimeTypes: string[] = [];
    const extensions: string[] = [];

    for (const part of parts) {
        if (part.startsWith('.')) {
            extensions.push(part.toLowerCase());
        } else if (part.includes('/')) {
            mimeTypes.push(part);
        }
    }

    return { mimeTypes, extensions };
}

/**
 * Check if file matches accept criteria
 */
export function matchesAcceptCriteria(file: File, accept?: string): boolean {
    if (!accept) return true;

    const { mimeTypes, extensions } = parseAcceptAttribute(accept);
    const fileExtension = getFileExtension(file.name);

    // Check extensions
    if (extensions.length > 0) {
        const extensionMatch = extensions.some(ext => {
            if (ext === fileExtension) return true;
            // Handle wildcard patterns like image/*
            if (ext.endsWith('/*')) {
                const baseType = ext.substring(0, ext.length - 2);
                return file.type.startsWith(baseType + '/');
            }
            return false;
        });
        if (extensionMatch) return true;
    }

    // Check MIME types
    if (mimeTypes.length > 0) {
        const mimeMatch = mimeTypes.some(mimeType => {
            if (mimeType === file.type) return true;
            // Handle wildcard patterns like image/*
            if (mimeType.endsWith('/*')) {
                const baseType = mimeType.substring(0, mimeType.length - 2);
                return file.type.startsWith(baseType + '/');
            }
            return false;
        });
        if (mimeMatch) return true;
    }

    return false;
}

/**
 * Validate a single file against field configuration
 */
export function validateFile(file: File, field: FileUploadField): FileValidationResult {
    const errors: FileValidationError[] = [];

    // Check for dangerous extensions
    if (isDangerousExtension(file.name)) {
        errors.push({
            type: 'file-type',
            message: `File type "${getFileExtension(file.name)}" is not allowed for security reasons`,
            file
        });
    }

    // Validate file type against accept attribute
    if (field.accept && !matchesAcceptCriteria(file, field.accept)) {
        errors.push({
            type: 'file-type',
            message: `File type "${file.type || 'unknown'}" is not accepted. Allowed types: ${field.accept}`,
            file
        });
    }

    // Validate file size
    if (field.maxSize && file.size > field.maxSize) {
        errors.push({
            type: 'file-size',
            message: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(field.maxSize)})`,
            file
        });
    }

    // Validate MIME type consistency
    if (!validateMimeType(file)) {
        errors.push({
            type: 'mime-type',
            message: `File MIME type "${file.type}" does not match file extension "${getFileExtension(file.name)}"`,
            file
        });
    }

    // Validate filename
    const sanitizedName = sanitizeFilename(file.name);
    if (sanitizedName !== file.name) {
        errors.push({
            type: 'filename',
            message: `Filename contains invalid characters. Suggested name: "${sanitizedName}"`,
            file
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate multiple files against field configuration
 */
export function validateFiles(files: File[], field: FileUploadField, currentFileCount: number = 0): FileValidationResult {
    const errors: FileValidationError[] = [];

    // Check file count limit
    if (field.maxFiles && (currentFileCount + files.length) > field.maxFiles) {
        errors.push({
            type: 'file-count',
            message: `Cannot add ${files.length} files. Maximum allowed: ${field.maxFiles}, current: ${currentFileCount}`
        });
    }

    // Validate each file individually
    for (const file of files) {
        const fileValidation = validateFile(file, field);
        errors.push(...fileValidation.errors);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Get user-friendly error message for validation errors
 */
export function getValidationErrorMessage(errors: FileValidationError[]): string {
    if (errors.length === 0) return '';

    if (errors.length === 1) {
        return errors[0].message;
    }

    // Group errors by type
    const errorsByType = errors.reduce((acc, error) => {
        if (!acc[error.type]) acc[error.type] = [];
        acc[error.type].push(error);
        return acc;
    }, {} as Record<string, FileValidationError[]>);

    const messages: string[] = [];

    if (errorsByType['file-count']) {
        messages.push(errorsByType['file-count'][0].message);
    }

    if (errorsByType['file-type']) {
        const count = errorsByType['file-type'].length;
        messages.push(`${count} file${count > 1 ? 's have' : ' has'} invalid type${count > 1 ? 's' : ''}`);
    }

    if (errorsByType['file-size']) {
        const count = errorsByType['file-size'].length;
        messages.push(`${count} file${count > 1 ? 's are' : ' is'} too large`);
    }

    if (errorsByType['mime-type']) {
        const count = errorsByType['mime-type'].length;
        messages.push(`${count} file${count > 1 ? 's have' : ' has'} mismatched MIME type${count > 1 ? 's' : ''}`);
    }

    if (errorsByType['filename']) {
        const count = errorsByType['filename'].length;
        messages.push(`${count} file${count > 1 ? 's have' : ' has'} invalid filename${count > 1 ? 's' : ''}`);
    }

    return messages.join(', ');
}

/**
 * Create a sanitized copy of a file with a clean filename
 */
export function createSanitizedFile(file: File): File {
    const sanitizedName = sanitizeFilename(file.name);
    if (sanitizedName === file.name) {
        return file;
    }

    return new File([file], sanitizedName, {
        type: file.type,
        lastModified: file.lastModified
    });
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Error types for file upload operations
 */
export enum FileUploadErrorType {
    NETWORK_ERROR = 'network-error',
    AUTHENTICATION_ERROR = 'authentication-error',
    AUTHORIZATION_ERROR = 'authorization-error',
    STORAGE_QUOTA_ERROR = 'storage-quota-error',
    FILE_TOO_LARGE = 'file-too-large',
    INVALID_FILE_TYPE = 'invalid-file-type',
    OPTIMIZATION_ERROR = 'optimization-error',
    CONFIGURATION_ERROR = 'configuration-error',
    UNKNOWN_ERROR = 'unknown-error'
}

/**
 * Structured error information
 */
export interface FileUploadError {
    type: FileUploadErrorType;
    message: string;
    userMessage: string;
    retryable: boolean;
    fileName?: string;
    originalError?: Error;
    suggestedAction?: string;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
    maxAttempts: number;
    baseDelay: number; // milliseconds
    maxDelay: number; // milliseconds
    backoffMultiplier: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
};

/**
 * Parse and categorize errors from various sources
 */
export function parseUploadError(error: unknown, fileName?: string): FileUploadError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();

    // Network-related errors
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch') ||
        lowerMessage.includes('connection') || lowerMessage.includes('timeout')) {
        return {
            type: FileUploadErrorType.NETWORK_ERROR,
            message: errorMessage,
            userMessage: 'Network connection failed. Please check your internet connection and try again.',
            retryable: true,
            fileName,
            originalError: error instanceof Error ? error : undefined,
            suggestedAction: 'Check your internet connection and retry'
        };
    }

    // Authentication errors
    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('invalid credentials') ||
        lowerMessage.includes('access denied') || lowerMessage.includes('forbidden')) {
        return {
            type: FileUploadErrorType.AUTHENTICATION_ERROR,
            message: errorMessage,
            userMessage: 'Upload service is not properly configured. Please contact your administrator.',
            retryable: false,
            fileName,
            originalError: error instanceof Error ? error : undefined,
            suggestedAction: 'Contact administrator to check R2 credentials'
        };
    }

    // Storage quota errors
    if (lowerMessage.includes('quota') || lowerMessage.includes('storage limit') ||
        lowerMessage.includes('insufficient storage')) {
        return {
            type: FileUploadErrorType.STORAGE_QUOTA_ERROR,
            message: errorMessage,
            userMessage: 'Storage quota exceeded. Please free up space or contact your administrator.',
            retryable: false,
            fileName,
            originalError: error instanceof Error ? error : undefined,
            suggestedAction: 'Free up storage space or contact administrator'
        };
    }

    // File size errors
    if (lowerMessage.includes('file too large') || lowerMessage.includes('size limit') ||
        lowerMessage.includes('exceeds maximum')) {
        return {
            type: FileUploadErrorType.FILE_TOO_LARGE,
            message: errorMessage,
            userMessage: fileName ? `File "${fileName}" is too large. Please choose a smaller file.` : 'File is too large. Please choose a smaller file.',
            retryable: false,
            fileName,
            originalError: error instanceof Error ? error : undefined,
            suggestedAction: 'Compress the file or choose a smaller file'
        };
    }

    // File type errors
    if (lowerMessage.includes('file type') || lowerMessage.includes('not supported') ||
        lowerMessage.includes('invalid format')) {
        return {
            type: FileUploadErrorType.INVALID_FILE_TYPE,
            message: errorMessage,
            userMessage: fileName ? `File "${fileName}" is not a supported file type.` : 'File type is not supported.',
            retryable: false,
            fileName,
            originalError: error instanceof Error ? error : undefined,
            suggestedAction: 'Choose a different file type'
        };
    }

    // Optimization errors
    if (lowerMessage.includes('optimization') || lowerMessage.includes('image processing') ||
        lowerMessage.includes('conversion failed')) {
        return {
            type: FileUploadErrorType.OPTIMIZATION_ERROR,
            message: errorMessage,
            userMessage: fileName ? `Failed to optimize "${fileName}". The file will be uploaded without optimization.` : 'File optimization failed. The file will be uploaded without optimization.',
            retryable: true,
            fileName,
            originalError: error instanceof Error ? error : undefined,
            suggestedAction: 'File will be uploaded without optimization'
        };
    }

    // Configuration errors
    if (lowerMessage.includes('not configured') || lowerMessage.includes('missing') ||
        lowerMessage.includes('invalid configuration')) {
        return {
            type: FileUploadErrorType.CONFIGURATION_ERROR,
            message: errorMessage,
            userMessage: 'Upload service is not properly configured. Please contact your administrator.',
            retryable: false,
            fileName,
            originalError: error instanceof Error ? error : undefined,
            suggestedAction: 'Contact administrator to check configuration'
        };
    }

    // Default to unknown error
    return {
        type: FileUploadErrorType.UNKNOWN_ERROR,
        message: errorMessage,
        userMessage: fileName ? `Failed to upload "${fileName}". Please try again.` : 'Upload failed. Please try again.',
        retryable: true,
        fileName,
        originalError: error instanceof Error ? error : undefined,
        suggestedAction: 'Try again or contact support if the problem persists'
    };
}

/**
 * Retry mechanism with exponential backoff
 */
export async function retryOperation<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
    const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Don't retry on the last attempt
            if (attempt === retryConfig.maxAttempts) {
                break;
            }

            // Check if error is retryable
            const parsedError = parseUploadError(error);
            if (!parsedError.retryable) {
                throw lastError;
            }

            // Call retry callback
            onRetry?.(attempt, lastError);

            // Calculate delay with exponential backoff
            const delay = Math.min(
                retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
                retryConfig.maxDelay
            );

            // Add jitter to prevent thundering herd
            const jitteredDelay = delay + Math.random() * 1000;

            await new Promise(resolve => setTimeout(resolve, jitteredDelay));
        }
    }

    throw lastError!;
}

/**
 * Create user-friendly error messages for different scenarios
 */
export function createErrorMessage(errors: FileUploadError[]): string {
    if (errors.length === 0) return '';

    if (errors.length === 1) {
        return errors[0].userMessage;
    }

    // Group errors by type
    const errorsByType = errors.reduce((acc, error) => {
        if (!acc[error.type]) acc[error.type] = [];
        acc[error.type].push(error);
        return acc;
    }, {} as Record<FileUploadErrorType, FileUploadError[]>);

    const messages: string[] = [];

    // Network errors
    if (errorsByType[FileUploadErrorType.NETWORK_ERROR]) {
        messages.push('Network connection failed for some files');
    }

    // Authentication errors
    if (errorsByType[FileUploadErrorType.AUTHENTICATION_ERROR]) {
        messages.push('Upload service authentication failed');
    }

    // File type errors
    if (errorsByType[FileUploadErrorType.INVALID_FILE_TYPE]) {
        const count = errorsByType[FileUploadErrorType.INVALID_FILE_TYPE].length;
        messages.push(`${count} file${count > 1 ? 's have' : ' has'} unsupported type${count > 1 ? 's' : ''}`);
    }

    // File size errors
    if (errorsByType[FileUploadErrorType.FILE_TOO_LARGE]) {
        const count = errorsByType[FileUploadErrorType.FILE_TOO_LARGE].length;
        messages.push(`${count} file${count > 1 ? 's are' : ' is'} too large`);
    }

    // Other errors
    const otherTypes = [
        FileUploadErrorType.STORAGE_QUOTA_ERROR,
        FileUploadErrorType.OPTIMIZATION_ERROR,
        FileUploadErrorType.CONFIGURATION_ERROR,
        FileUploadErrorType.UNKNOWN_ERROR
    ];

    const otherErrors = otherTypes.reduce((count, type) => {
        return count + (errorsByType[type]?.length || 0);
    }, 0);

    if (otherErrors > 0) {
        messages.push(`${otherErrors} other error${otherErrors > 1 ? 's' : ''} occurred`);
    }

    return messages.join(', ');
}

/**
 * Check if the current environment supports file uploads
 */
export function checkUploadSupport(): { supported: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for File API support
    if (typeof File === 'undefined') {
        errors.push('File API not supported');
    }

    // Check for FileReader API support
    if (typeof FileReader === 'undefined') {
        errors.push('FileReader API not supported');
    }

    // Check for Canvas API support (for image optimization)
    if (typeof HTMLCanvasElement === 'undefined') {
        errors.push('Canvas API not supported (image optimization disabled)');
    }

    // Check for Blob API support
    if (typeof Blob === 'undefined') {
        errors.push('Blob API not supported');
    }

    return {
        supported: errors.length === 0,
        errors
    };
}

/**
 * Graceful degradation helper
 */
export function createGracefulDegradationMessage(missingFeatures: string[]): string {
    if (missingFeatures.length === 0) return '';

    const baseMessage = 'Some features are not available in your browser:';
    const featureList = missingFeatures.map(feature => `• ${feature}`).join('\n');
    const suggestion = 'Please use a modern browser for the best experience.';

    return `${baseMessage}\n${featureList}\n\n${suggestion}`;
}