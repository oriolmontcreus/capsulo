/**
 * Validation Context Provider
 * 
 * Provides validation error state management throughout the CMS interface.
 * This context manages the error sidebar, error navigation, and error counting.
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';

// Types
export interface ValidationError {
    componentId: string;
    componentName: string;
    fieldPath: string;
    fieldLabel: string;
    tabName?: string;
    tabIndex?: number;
    message: string;
}

export interface ValidationState {
    /** All validation errors keyed by componentId, then fieldPath */
    errors: Record<string, Record<string, string>>;
    /** Flattened list of error details for navigation */
    errorList: ValidationError[];
    /** Currently active error field path (for highlighting) */
    activeErrorField: string | null;
    /** Currently active error component ID */
    activeErrorComponentId: string | null;
    /** Current index in the error list */
    currentErrorIndex: number;
    /** Timestamp/ID of the last navigation action to force UI updates */
    lastNavigationId: number;
    /** Whether the error sidebar is open */
    sidebarOpen: boolean;
}

export interface ValidationContextValue {
    /** Current validation errors */
    errors: Record<string, Record<string, string>>;
    /** Flattened error list for display */
    errorList: ValidationError[];
    /** Currently highlighted error field */
    activeErrorField: string | null;
    /** Currently active error component */
    activeErrorComponentId: string | null;
    /** Current error index */
    currentErrorIndex: number;
    /** ID to track navigation events */
    lastNavigationId: number;
    /** Total error count */
    totalErrors: number;
    /** Whether error sidebar is open */
    isErrorSidebarOpen: boolean;
    /** Set validation errors from form validation */
    setValidationErrors: (
        errors: Record<string, Record<string, string>>,
        errorDetails?: ValidationError[]
    ) => void;
    /** Clear all validation errors */
    clearValidationErrors: () => void;
    /** Navigate to next or previous error */
    navigateToError: (direction: 'next' | 'prev') => void;
    /** Go to a specific error by field path */
    goToError: (componentId: string, fieldPath: string) => void;
    /** Open the error sidebar */
    openErrorSidebar: () => void;
    /** Close the error sidebar */
    closeErrorSidebar: () => void;
    /** Get error count for a specific component */
    getComponentErrorCount: (componentId: string) => number;
    /** Get error count for a specific tab within a component */
    getTabErrorCount: (componentId: string, tabIndex: number) => number;
    /** Check if a field has an error */
    hasFieldError: (componentId: string, fieldPath: string) => boolean;
    /** Get error message for a field */
    getFieldError: (componentId: string, fieldPath: string) => string | undefined;
}

// Action types
type ValidationAction =
    | {
        type: 'SET_ERRORS';
        errors: Record<string, Record<string, string>>;
        errorList: ValidationError[];
    }
    | { type: 'CLEAR_ERRORS' }
    | { type: 'NAVIGATE_TO_ERROR'; direction: 'next' | 'prev' }
    | { type: 'GO_TO_ERROR'; componentId: string; fieldPath: string }
    | { type: 'OPEN_SIDEBAR' }
    | { type: 'CLOSE_SIDEBAR' };

// Initial state
const initialState: ValidationState = {
    errors: {},
    errorList: [],
    activeErrorField: null,
    activeErrorComponentId: null,
    currentErrorIndex: -1,
    lastNavigationId: 0,
    sidebarOpen: false,
};

// Reducer
function validationReducer(state: ValidationState, action: ValidationAction): ValidationState {
    switch (action.type) {
        case 'SET_ERRORS': {
            const hasErrors = action.errorList.length > 0;
            return {
                ...state,
                errors: action.errors,
                errorList: action.errorList,
                // Auto-select first error and open sidebar if there are errors
                activeErrorField: hasErrors ? action.errorList[0].fieldPath : null,
                activeErrorComponentId: hasErrors ? action.errorList[0].componentId : null,
                currentErrorIndex: hasErrors ? 0 : -1,
                lastNavigationId: hasErrors ? Date.now() : state.lastNavigationId,
                sidebarOpen: hasErrors, // Auto-open on errors
            };
        }
        case 'CLEAR_ERRORS':
            return {
                ...initialState,
            };
        case 'NAVIGATE_TO_ERROR': {
            const { errorList, currentErrorIndex } = state;
            if (errorList.length === 0) return state;

            let newIndex: number;
            if (action.direction === 'next') {
                newIndex = currentErrorIndex < errorList.length - 1
                    ? currentErrorIndex + 1
                    : 0; // Wrap to beginning
            } else {
                newIndex = currentErrorIndex > 0
                    ? currentErrorIndex - 1
                    : errorList.length - 1; // Wrap to end
            }

            const error = errorList[newIndex];
            return {
                ...state,
                currentErrorIndex: newIndex,
                activeErrorField: error.fieldPath,
                activeErrorComponentId: error.componentId,
                lastNavigationId: Date.now(),
            };
        }
        case 'GO_TO_ERROR': {
            const index = state.errorList.findIndex(
                e => e.componentId === action.componentId && e.fieldPath === action.fieldPath
            );
            if (index === -1) return state;

            // Even if index/field is same, we update lastNavigationId to force scroll
            return {
                ...state,
                currentErrorIndex: index,
                activeErrorField: action.fieldPath,
                activeErrorComponentId: action.componentId,
                lastNavigationId: Date.now(),
            };
        }
        case 'OPEN_SIDEBAR':
            return {
                ...state,
                sidebarOpen: true,
            };
        case 'CLOSE_SIDEBAR':
            return {
                ...state,
                sidebarOpen: false,
                activeErrorField: null,
                activeErrorComponentId: null,
                currentErrorIndex: -1,
            };
        default:
            return state;
    }
}

// Create context
export const ValidationContext = createContext<ValidationContextValue | null>(null);

// Provider props
interface ValidationProviderProps {
    children: React.ReactNode;
}

/**
 * Validation Context Provider Component
 * 
 * Wraps the CMS interface to provide validation error management.
 */
export function ValidationProvider({ children }: ValidationProviderProps) {
    const [state, dispatch] = useReducer(validationReducer, initialState);

    // Actions
    const setValidationErrors = useCallback((
        errors: Record<string, Record<string, string>>,
        errorDetails: ValidationError[] = []
    ) => {
        dispatch({ type: 'SET_ERRORS', errors, errorList: errorDetails });
    }, []);

    const clearValidationErrors = useCallback(() => {
        dispatch({ type: 'CLEAR_ERRORS' });
    }, []);

    const navigateToError = useCallback((direction: 'next' | 'prev') => {
        dispatch({ type: 'NAVIGATE_TO_ERROR', direction });
    }, []);

    const goToError = useCallback((componentId: string, fieldPath: string) => {
        dispatch({ type: 'GO_TO_ERROR', componentId, fieldPath });
    }, []);

    const openErrorSidebar = useCallback(() => {
        dispatch({ type: 'OPEN_SIDEBAR' });
    }, []);

    const closeErrorSidebar = useCallback(() => {
        dispatch({ type: 'CLOSE_SIDEBAR' });
    }, []);

    // Utility functions
    const getComponentErrorCount = useCallback((componentId: string): number => {
        const componentErrors = state.errors[componentId];
        return componentErrors ? Object.keys(componentErrors).length : 0;
    }, [state.errors]);

    const getTabErrorCount = useCallback((componentId: string, tabIndex: number): number => {
        // Count errors that belong to a specific tab
        return state.errorList.filter(
            e => e.componentId === componentId && e.tabIndex === tabIndex
        ).length;
    }, [state.errorList]);

    const hasFieldError = useCallback((componentId: string, fieldPath: string): boolean => {
        return !!state.errors[componentId]?.[fieldPath];
    }, [state.errors]);

    const getFieldError = useCallback((componentId: string, fieldPath: string): string | undefined => {
        return state.errors[componentId]?.[fieldPath];
    }, [state.errors]);

    // Memoized context value
    const contextValue: ValidationContextValue = useMemo(() => ({
        errors: state.errors,
        errorList: state.errorList,
        activeErrorField: state.activeErrorField,
        activeErrorComponentId: state.activeErrorComponentId,
        currentErrorIndex: state.currentErrorIndex,
        lastNavigationId: state.lastNavigationId,
        totalErrors: state.errorList.length,
        isErrorSidebarOpen: state.sidebarOpen,
        setValidationErrors,
        clearValidationErrors,
        navigateToError,
        goToError,
        openErrorSidebar,
        closeErrorSidebar,
        getComponentErrorCount,
        getTabErrorCount,
        hasFieldError,
        getFieldError,
    }), [
        state.errors,
        state.errorList,
        state.activeErrorField,
        state.activeErrorComponentId,
        state.currentErrorIndex,
        state.lastNavigationId,
        state.sidebarOpen,
        setValidationErrors,
        clearValidationErrors,
        navigateToError,
        goToError,
        openErrorSidebar,
        closeErrorSidebar,
        getComponentErrorCount,
        getTabErrorCount,
        hasFieldError,
        getFieldError,
    ]);

    return (
        <ValidationContext.Provider value={contextValue}>
            {children}
        </ValidationContext.Provider>
    );
}

/**
 * Hook to use the validation context
 * 
 * @throws Error if used outside of ValidationProvider
 */
export function useValidation(): ValidationContextValue {
    const context = useContext(ValidationContext);

    if (!context) {
        throw new Error('useValidation must be used within a ValidationProvider');
    }

    return context;
}

/**
 * Hook to safely use validation context (returns null if not in provider)
 * Useful for components that may or may not be wrapped in ValidationProvider
 */
export function useValidationOptional(): ValidationContextValue | null {
    return useContext(ValidationContext);
}
