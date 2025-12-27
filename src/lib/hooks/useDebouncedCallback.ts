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

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, [delay]);

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

/**
 * Custom debounced value hook with status.
 * Returns both the debounced value and whether we're currently debouncing.
 * 
 * @param value - The value to debounce
 * @param delay - Debounce delay in milliseconds
 * @returns Tuple of [debouncedValue, isDebouncing]
 */
export function useDebouncedValueWithStatus<T>(value: T, delay: number): [T, boolean] {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    const [isDebouncing, setIsDebouncing] = useState(false);
    const valueRef = useRef(value);

    useEffect(() => {
        // Check if value actually changed
        const valueChanged = valueRef.current !== value;
        valueRef.current = value;

        if (valueChanged) {
            setIsDebouncing(true);
        }

        const timeout = setTimeout(() => {
            setDebouncedValue(value);
            setIsDebouncing(false);
        }, delay);

        return () => clearTimeout(timeout);
    }, [value, delay]);

    return [debouncedValue, isDebouncing];
}
