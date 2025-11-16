import type { AspectRatio } from '../fileUpload.types';

/**
 * Convert aspect ratio string to CSS aspect-ratio value
 */
export const getAspectRatioValue = (ratio: AspectRatio): string => {
    switch (ratio) {
        case 'square':
            return '1 / 1';
        case 'video':
            return '16 / 9';
        case 'wide':
            return '21 / 9';
        case 'portrait':
            return '9 / 16';
        case 'auto':
            return 'auto';
        default:
            // Handle custom ratios like '4:3' or '3:2'
            if (ratio.includes(':'))  return ratio.replace(':', ' / ');
            return ratio;
    }
};

/**
 * Get default aspect ratio based on file type
 */
export const getDefaultAspectRatio = (fileType: string): AspectRatio => {
    if (fileType.startsWith('video/')) {
        return 'video';
    }
    if (fileType.startsWith('image/')) {
        return 'auto'; // Let images use their natural aspect ratio
    }
    return 'square'; // Default for documents and other files
};
