/**
 * TranslationIcon Component
 * 
 * Displays a status indicator icon next to translatable fields.
 * Shows green when all translations are complete, red when missing.
 * This is a pure indicator - not interactive.
 */

import React from 'react';
import { Languages } from 'lucide-react';
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
     * Additional CSS classes
     */
    className?: string;
}

/**
 * TranslationIcon Component
 * 
 * Renders a languages icon with status-based coloring:
 * - Green: All translations complete
 * - Red: Missing translations
 */
function TranslationIconComponent({
    fieldPath,
    isTranslatable,
    status,
    className
}: TranslationIconProps) {
    // Don't render if field is not translatable
    if (!isTranslatable) {
        return null;
    }

    // Determine icon color based on translation status
    const getStatusColor = (status: TranslationStatus): string => {
        if (status === 'complete') {
            return 'text-green-500';
        }
        // All other states (missing, partial, etc.) = red
        return 'text-red-500';
    };

    const getStatusTitle = (status: TranslationStatus): string => {
        if (status === 'complete') {
            return 'All translations complete';
        }
        return 'Missing translations';
    };

    return (
        <span
            role="img"
            data-testid="translation-icon"
            data-field-path={fieldPath}
            className={cn(
                'inline-flex items-center justify-center',
                'w-5 h-5',
                'transition-colors duration-200',
                getStatusColor(status),
                className
            )}
            title={getStatusTitle(status)}
            aria-label={getStatusTitle(status)}
        >
            <Languages className="size-3.5" />
        </span>
    );
}

export const TranslationIcon = React.memo(TranslationIconComponent);