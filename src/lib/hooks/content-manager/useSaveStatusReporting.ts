import { useState, useEffect, useRef } from 'react';
import config from '@/capsulo.config';

interface UseSaveStatusReportingProps {
    /** Whether form data is currently debouncing */
    isFormDebouncing: boolean;
    /** Whether translation data is currently debouncing */
    isTranslationDebouncing: boolean;
    /** Callback to report save status to parent. Does not need to be memoized. */
    onSaveStatusChange?: (isDebouncing: boolean) => void;
}

/**
 * Hook to manage save status reporting with an initial blocking period.
 * Prevents "Saving..." indicator from showing during initial load/hydration.
 */
export function useSaveStatusReporting({
    isFormDebouncing,
    isTranslationDebouncing,
    onSaveStatusChange
}: UseSaveStatusReportingProps): void {
    const [saveStatusBlocked, setSaveStatusBlocked] = useState(true);

    // Use ref to avoid callback dependency causing excessive re-renders
    const callbackRef = useRef(onSaveStatusChange);
    callbackRef.current = onSaveStatusChange;

    // Unblock save status reporting after configured duration
    useEffect(() => {
        const timer = setTimeout(() => {
            setSaveStatusBlocked(false);
        }, config.ui.autoSaveBlockDurationMs ?? 2500);
        return () => clearTimeout(timer);
    }, []);

    // Report status to parent
    useEffect(() => {
        if (saveStatusBlocked) {
            // During initial load period, always report false (not saving)
            callbackRef.current?.(false);
        } else {
            // After block period, report actual status
            callbackRef.current?.(isFormDebouncing || isTranslationDebouncing);
        }
    }, [isFormDebouncing, isTranslationDebouncing, saveStatusBlocked]);
}
