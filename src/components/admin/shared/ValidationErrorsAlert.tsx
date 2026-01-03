import React from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationErrorsAlertProps {
    /** Map of entityId -> fieldPath -> error message */
    validationErrors: Record<string, Record<string, string>>;
    /** Validation context for opening error sidebar */
    validationContext?: {
        openErrorSidebar: () => void;
    } | null;
}

/**
 * Alert component for displaying validation errors.
 * Clickable when validation context is available.
 */
export const ValidationErrorsAlert: React.FC<ValidationErrorsAlertProps> = ({
    validationErrors,
    validationContext
}) => {
    const errorCount = Object.values(validationErrors).reduce(
        (acc, errs) => acc + Object.keys(errs).length,
        0
    );

    if (errorCount === 0) {
        return null;
    }

    return (
        <Alert
            variant="destructive"
            className={cn(
                validationContext
                    ? 'cursor-pointer hover:bg-destructive/10 transition-colors'
                    : ''
            )}
            {...(validationContext ? { onClick: validationContext.openErrorSidebar } : {})}
        >
            <AlertTriangle className="h-4 w-4" />
            <div className="flex items-center justify-between w-full">
                <div>
                    <span className="font-semibold">{errorCount} validation error(s)</span>
                    <span className="ml-2 opacity-80">
                        Please fix the errors before saving.
                    </span>
                </div>
                {validationContext && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 -my-1 text-destructive hover:text-destructive hover:bg-destructive/20"
                    >
                        View all →
                    </Button>
                )}
            </div>
        </Alert>
    );
};
