import { useCallback, useRef } from 'react';
import { usePreferences, type ConfirmationAction } from '@/lib/context/PreferencesContext';

interface UseConfirmOptions {
    title?: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
}

export function useConfirm(action: ConfirmationAction, callback: () => void, options: UseConfirmOptions = {}) {
    const { shouldConfirm } = usePreferences();

    const handleConfirm = useCallback(() => {
        callback();
    }, [callback]);

    return {
        shouldConfirm: shouldConfirm(action),
        popoverProps: {
            onConfirm: handleConfirm,
            ...options,
        },
    };
}
