import type { ImageOptimizationConfig, FileUploadField } from './fileUpload.types';

/**
 * Detect if the user is on a Mac
 */
export function isMacOS(): boolean {
    if (typeof navigator === 'undefined') return false;
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

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
 * @param quality - Image quality from 0-100 (default: 85)
 */
export function processImageWithCanvas(
    img: HTMLImageElement,
    targetWidth: number,
    targetHeight: number,
    quality: number = 85,
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



// ============================================================================
// FILE VALIDATION FUNCTIONS
// ============================================================================

/**
 * Common dangerous file extensions
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
 * Basic MIME type validation
 */
export function validateMimeType(file: File): boolean {
    // Just check that it's not a dangerous executable type
    return !file.type.includes('application/x-executable') &&
        !file.type.includes('application/x-msdownload');
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

    // Check extensions first
    if (extensions.length > 0) {
        const extensionMatch = extensions.some(ext => {
            return ext === fileExtension;
        });
        if (extensionMatch) return true;
    }

    // Check MIME types
    if (mimeTypes.length > 0) {
        const mimeMatch = mimeTypes.some(mimeType => {
            if (mimeType === file.type) return true;
            // Handle wildcard patterns like image/* or audio/*
            if (mimeType.endsWith('/*')) {
                const baseType = mimeType.substring(0, mimeType.length - 2);
                return file.type.startsWith(baseType + '/');
            }
            return false;
        });
        if (mimeMatch) return true;
    }

    // If we have both extensions and MIME types, and neither matched, reject
    // If we only have one type of criteria, we already checked it above
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
 * Simple error information for file uploads
 */
export interface FileUploadError {
    message: string;
    fileName?: string;
}



/**
 * Simple error parser for upload operations
 */
export function parseUploadError(error: unknown, fileName?: string): FileUploadError {
    const message = error instanceof Error ? error.message : String(error);
    return { message, fileName };
}

/**
 * Simple retry mechanism for upload operations
 */
export async function retryOperation<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3
): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt === maxAttempts) {
                break;
            }

            // Simple exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
}

/**
 * Create user-friendly error messages
 */
export function createErrorMessage(errors: FileUploadError[]): string {
    if (errors.length === 0) return '';
    if (errors.length === 1) return errors[0].message;
    return `${errors.length} upload errors occurred: ${errors.map(e => e.message).join(', ')}`;
}

/**
 * Check if the current environment supports file uploads
 */
export function checkUploadSupport(): { supported: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof File === 'undefined') errors.push('File API not supported');
    if (typeof FileReader === 'undefined') errors.push('FileReader API not supported');
    if (typeof HTMLCanvasElement === 'undefined') errors.push('Canvas API not supported');
    if (typeof Blob === 'undefined') errors.push('Blob API not supported');

    return { supported: errors.length === 0, errors };
}

/**
 * Create graceful degradation message
 */
export function createGracefulDegradationMessage(missingFeatures: string[]): string {
    if (missingFeatures.length === 0) return '';
    return `Some features are not available: ${missingFeatures.join(', ')}. Please use a modern browser.`;
}