import { useCallback, useRef, useEffect, useState } from 'react';

/**
 * Custom debounce hook that returns a stable debounced callback.
 * Unlike useMemo-based approaches, this maintains callback identity across renders
 * while still debouncing the actual execution.
 * 
 * @param callback - The function to debounce
 * @param delay - Debounce delay in milliseconds
 * @returns A stable debounced function that can be called immediately
 * 
 * @example
 * const debouncedSave = useDebouncedCallback((value) => {
 *   saveToServer(value);
 * }, 300);
 * 
 * // Call immediately - execution will be debounced
 * debouncedSave(newValue);
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
    callback: T,
    delay: number
): (...args: Parameters<T>) => void {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const callbackRef = useRef<T>(callback);

    // Keep callback ref up to date
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // Return stable debounced function
    return useCallback((...args: Parameters<T>) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            callbackRef.current(...args);
        }, delay);
    }, [delay]);
}

/**
 * Custom debounced value hook.
 * Returns a value that only updates after the specified delay.
 * 
 * @param value - The value to debounce
 * @param delay - Debounce delay in milliseconds
 * @returns The debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(timeout);
    }, [value, delay]);

    return debouncedValue;
}
