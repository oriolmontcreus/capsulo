import { useCallback, useRef, useEffect, useState } from 'react';
import isEqual from 'lodash/isEqual';

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
 * Uses deep equality comparison for objects to prevent false positives.
 * 
 * @param value - The value to debounce
 * @param delay - Debounce delay in milliseconds
 * @returns Tuple of [debouncedValue, isDebouncing]
 */
export function useDebouncedValueWithStatus<T>(value: T, delay: number): [T, boolean] {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    const [isDebouncing, setIsDebouncing] = useState(false);
    const lastValueRef = useRef<T>(value);
    const isDebouncingRef = useRef(false);

    useEffect(() => {
        const valueChanged = !isEqual(lastValueRef.current, value);

        if (valueChanged) {
            lastValueRef.current = value;
            isDebouncingRef.current = true;
            setIsDebouncing(true);
        }

        const timeout = setTimeout(() => {
            setDebouncedValue(value);
            // Always clear debouncing state when timeout fires
            if (isDebouncingRef.current) {
                isDebouncingRef.current = false;
                setIsDebouncing(false);
            }
        }, delay);

        return () => {
            clearTimeout(timeout);
        };
    }, [value, delay]);

    return [debouncedValue, isDebouncing];
}
