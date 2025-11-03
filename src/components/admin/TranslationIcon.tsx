/**
 * TranslationIcon Component
 * 
 * Displays a globe icon next to translatable fields with status-based coloring.
 * Clicking the icon opens the translation sidebar for the specific field.
 */

import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TranslationStatus } from '@/lib/form-builder/core/translation.types';

interface TranslationIconProps {
    /**
     * Path to the field being translated (e.g., "hero.title")
     */
    fieldPath: string;

    /**
     * Whether this field is translatable
     */
    isTranslatable: boolean;

    /**
     * Translation status for visual indicator
     */
    status: TranslationStatus;

    /**
     * Click handler to open translation sidebar
     */
    onClick: () => void;

    /**
     * Additional CSS classes
     */
    className?: string;
}

/**
 * TranslationIcon Component
 * 
 * Renders a globe icon with status-based coloring:
 * - Green: All translations complete
 * - Red: Missing translations
 * - Gray: Partial translations or disabled
 */
export function TranslationIcon({
    fieldPath,
    isTranslatable,
    status,
    onClick,
    className
}: TranslationIconProps) {
    // Don't render if field is not translatable
    if (!isTranslatable) {
        return null;
    }

    // Determine icon color based on translation status
    const getStatusColor = (status: TranslationStatus): string => {
        switch (status) {
            case 'complete':
                return 'text-green-600 hover:text-green-700';
            case 'missing':
                return 'text-red-600 hover:text-red-700';
            case 'partial':
                return 'text-yellow-600 hover:text-yellow-700';
            default:
                return 'text-gray-400 hover:text-gray-500';
        }
    };

    return (
        <button
            type="button"
            onClick={onClick}
            data-testid="translation-icon"
            data-field-path={fieldPath}
            className={cn(
                'inline-flex items-center justify-center',
                'w-6 h-6 rounded-sm',
                'transition-colors duration-200',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'focus:outline-none focus:ring-2 focus:ring-primary/20',
                'cursor-pointer',
                getStatusColor(status),
                className
            )}
            title={`Translate field: ${fieldPath} (${status})`}
            aria-label={`Open translations for ${fieldPath}`}
        >
            <Globe className="h-4 w-4" />
        </button>
    );
}