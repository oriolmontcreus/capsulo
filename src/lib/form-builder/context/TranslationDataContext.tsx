import React, { createContext, useContext, useCallback, useSyncExternalStore } from 'react';
import { useTranslation } from './TranslationContext';
import * as translationStore from './translation-store';

interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

/**
 * Actions context - contains only stable action functions
 * These never change, so components subscribing only to actions won't re-render
 */
interface TranslationDataActionsValue {
    setCurrentComponent: (component: ComponentData | null) => void;
    setCurrentFormData: (data: Record<string, any>) => void;
    setTranslationValue: (fieldPath: string, locale: string, value: any) => void;
    updateMainFormValue: (fieldPath: string, value: any) => void;
    getTranslationValue: (fieldPath: string, locale: string) => any;
    getFieldValue: (fieldPath: string, locale?: string) => any;
    clearTranslationData: () => void;
}

/**
 * State context - contains reactive state that triggers re-renders
 */
interface TranslationDataStateValue {
    currentComponent: ComponentData | null;
    currentFormData: Record<string, any>;
    translationData: Record<string, Record<string, any>>;
}

/**
 * Combined context value for backward compatibility
 */
interface TranslationDataContextValue extends TranslationDataActionsValue, TranslationDataStateValue {
}

// ============================================================================
// CONTEXTS
// ============================================================================

// Actions context - stable, never causes re-renders
const TranslationDataActionsContext = createContext<TranslationDataActionsValue | null>(null);

// State context - reactive, triggers re-renders on state change
const TranslationDataStateContext = createContext<TranslationDataStateValue | null>(null);

// Combined context for backward compatibility
const TranslationDataContext = createContext<TranslationDataContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface TranslationDataProviderProps {
    children: React.ReactNode;
}

export function TranslationDataProvider({ children }: TranslationDataProviderProps) {
    const { defaultLocale } = useTranslation();

    // Use external store for state - this enables granular subscriptions
    const storeState = useSyncExternalStore(
        translationStore.subscribe,
        translationStore.getSnapshot,
        translationStore.getSnapshot // Server snapshot (same as client for now)
    );

    // ========================================================================
    // ACTION FUNCTIONS (stable, never recreated)
    // ========================================================================

    const setCurrentComponent = useCallback((component: ComponentData | null) => {
        translationStore.setCurrentComponent(component);
    }, []);

    const setCurrentFormData = useCallback((data: Record<string, any>) => {
        translationStore.setCurrentFormData(data);
    }, []);

    const setTranslationValueAction = useCallback((fieldPath: string, locale: string, value: any) => {
        translationStore.setTranslationValue(fieldPath, locale, value);

        // If this is the default locale, also update the main form data
        // The store handles this atomically now
        if (locale === defaultLocale) {
            translationStore.updateFormDataField(fieldPath, value);
        }
    }, [defaultLocale]);

    const updateMainFormValueAction = useCallback((fieldPath: string, value: any) => {
        // Use atomic update that updates both form data and translation data at once
        translationStore.updateMainFormValue(fieldPath, value, defaultLocale);
    }, [defaultLocale]);

    const getTranslationValue = useCallback((fieldPath: string, locale: string): any => {
        return translationStore.getTranslationValue(fieldPath, locale);
    }, []);

    const getFieldValue = useCallback((fieldPath: string, locale?: string): any => {
        const targetLocale = locale || defaultLocale;
        const snapshot = translationStore.getSnapshot();

        // First check translation data
        const translationValue = getNestedValue(snapshot.translationData[targetLocale], fieldPath);
        if (translationValue !== undefined) {
            return translationValue;
        }

        // For default locale ONLY, check current form data and component data
        if (targetLocale === defaultLocale) {
            const formValue = getNestedValue(snapshot.currentFormData, fieldPath);
            if (formValue !== undefined) {
                return formValue;
            }

            // Fallback to component data for default locale
            const [fieldName, ...restPath] = fieldPath.split('.');
            const componentFieldData = snapshot.currentComponent?.data[fieldName];

            if (componentFieldData?.value !== undefined) {
                // Check if value is an object with locale keys (legacy translation format)
                if (
                    componentFieldData.value !== null &&
                    typeof componentFieldData.value === 'object' &&
                    !Array.isArray(componentFieldData.value) &&
                    componentFieldData.value[defaultLocale] !== undefined
                ) {
                    const localeValue = componentFieldData.value[defaultLocale];
                    if (restPath.length > 0) {
                        return getNestedValue(localeValue, restPath.join('.'));
                    }
                    return localeValue;
                } else {
                    if (restPath.length > 0) {
                        return getNestedValue(componentFieldData.value, restPath.join('.'));
                    }
                    return componentFieldData.value;
                }
            }
        } else {
            // For non-default locales, also check component data
            const [fieldName, ...restPath] = fieldPath.split('.');
            const componentFieldData = snapshot.currentComponent?.data[fieldName];

            if (
                componentFieldData &&
                componentFieldData.value !== null &&
                typeof componentFieldData.value === 'object' &&
                !Array.isArray(componentFieldData.value)
            ) {
                const localeValue = componentFieldData.value[targetLocale];
                if (localeValue !== undefined) {
                    if (restPath.length > 0) {
                        return getNestedValue(localeValue, restPath.join('.'));
                    }
                    return localeValue;
                }
            }
        }

        return undefined;
    }, [defaultLocale]);

    const clearTranslationData = useCallback(() => {
        translationStore.clearTranslationData();
    }, []);

    // ========================================================================
    // MEMOIZED CONTEXT VALUES
    // ========================================================================

    // Actions value - completely stable, never changes
    const actionsValue: TranslationDataActionsValue = React.useMemo(() => ({
        setCurrentComponent,
        setCurrentFormData,
        setTranslationValue: setTranslationValueAction,
        updateMainFormValue: updateMainFormValueAction,
        getTranslationValue,
        getFieldValue,
        clearTranslationData,
    }), [
        setCurrentComponent,
        setCurrentFormData,
        setTranslationValueAction,
        updateMainFormValueAction,
        getTranslationValue,
        getFieldValue,
        clearTranslationData,
    ]);

    // State value - changes when store state changes
    const stateValue: TranslationDataStateValue = React.useMemo(() => ({
        currentComponent: storeState.currentComponent,
        currentFormData: storeState.currentFormData,
        translationData: storeState.translationData,
    }), [storeState.currentComponent, storeState.currentFormData, storeState.translationData]);

    // Combined value for backward compatibility
    const combinedValue: TranslationDataContextValue = React.useMemo(() => ({
        ...actionsValue,
        ...stateValue,
    }), [actionsValue, stateValue]);

    return (
        <TranslationDataActionsContext.Provider value={actionsValue}>
            <TranslationDataStateContext.Provider value={stateValue}>
                <TranslationDataContext.Provider value={combinedValue}>
                    {children}
                </TranslationDataContext.Provider>
            </TranslationDataStateContext.Provider>
        </TranslationDataActionsContext.Provider>
    );
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Full context hook for backward compatibility.
 * Subscribes to ALL state changes.
 */
export function useTranslationData(): TranslationDataContextValue {
    const context = useContext(TranslationDataContext);
    if (!context) {
        throw new Error('useTranslationData must be used within a TranslationDataProvider');
    }
    return context;
}

/**
 * Hook to use the translation data context optionally.
 * Returns null if used outside of TranslationDataProvider instead of throwing.
 */
export function useTranslationDataOptional(): TranslationDataContextValue | null {
    return useContext(TranslationDataContext);
}

/**
 * Hook to access only the action functions.
 * Components using this won't re-render when state changes.
 * Use this for write-only operations.
 */
export function useTranslationDataActions(): TranslationDataActionsValue {
    const context = useContext(TranslationDataActionsContext);
    if (!context) {
        throw new Error('useTranslationDataActions must be used within a TranslationDataProvider');
    }
    return context;
}

/**
 * Hook to access only the state values.
 * Components using this will re-render when state changes.
 */
export function useTranslationDataState(): TranslationDataStateValue {
    const context = useContext(TranslationDataStateContext);
    if (!context) {
        throw new Error('useTranslationDataState must be used within a TranslationDataProvider');
    }
    return context;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get a nested value from an object using a dot-separated path.
 */
function getNestedValue(obj: Record<string, any> | undefined, path: string): any {
    if (!obj || !path) return undefined;

    const parts = path.split('.');
    let current: any = obj;

    for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        current = current[part];
    }

    return current;
}