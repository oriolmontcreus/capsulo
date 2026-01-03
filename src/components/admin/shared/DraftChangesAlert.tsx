import React from 'react';
import { Alert } from '@/components/ui/alert';
import { PublishButton } from '../PublishButton';
import { isDevelopmentMode } from '@/lib/cms-storage-adapter';

interface DraftChangesAlertProps {
    /** Whether there are unpublished changes */
    hasChanges: boolean;
    /** Callback when publish completes */
    onPublished: () => void;
}

/**
 * Alert component showing draft changes with publish button.
 * Only shown when there are changes and not in development mode.
 */
export const DraftChangesAlert: React.FC<DraftChangesAlertProps> = ({
    hasChanges,
    onPublished
}) => {
    if (!hasChanges || isDevelopmentMode()) {
        return null;
    }

    return (
        <Alert>
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-semibold">Draft Changes</h3>
                    <p className="text-sm mt-1">
                        Your changes are saved to a draft branch. Click publish to make them live.
                    </p>
                </div>
                <div className="flex gap-2 ml-4">
                    <PublishButton onPublished={onPublished} />
                </div>
            </div>
        </Alert>
    );
};
