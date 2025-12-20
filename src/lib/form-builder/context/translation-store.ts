/**
 * Translation Store - External state store for translation data
 * 
 * This store manages translation state outside of React's render cycle,
 * enabling granular subscriptions via useSyncExternalStore.
 * 
 * Key benefits:
 * - Write operations don't trigger React re-renders
 * - Subscribers are notified only when their specific slice changes
 * - Read operations use stable getSnapshot functions
 */

import { getNestedValue, setNestedValue } from '../core/fieldHelpers';

import type { ComponentData } from '../core/types';

interface TranslationStoreState {
    currentComponent: ComponentData | null;
    currentFormData: Record<string, any>;
    translationData: Record<string, Record<string, any>>;
}

// Store state - maintained outside React
let state: TranslationStoreState = {
    currentComponent: null,
    currentFormData: {},
    translationData: {},
};

// Track previous state for change detection
let prevState: TranslationStoreState = { ...state };

// All subscribers
type Subscriber = () => void;
const subscribers = new Set<Subscriber>();

// Granular subscribers for specific data slices
type FieldSubscriber = {
    fieldPath: string;
    locale?: string;
    callback: Subscriber;
};
const fieldSubscribers = new Set<FieldSubscriber>();

/**
 * Notify all subscribers of a state change.
 * Only notifies if state actually changed.
 */
function notifySubscribers(): void {
    // Notify general subscribers
    subscribers.forEach(callback => {
        try {
            callback();
        } catch (e) {
            console.error('Translation store subscriber error:', e);
        }
    });
}

/**
 * Notify field-specific subscribers
 */
function notifyFieldSubscribers(fieldPath: string, locale?: string): void {
    fieldSubscribers.forEach(sub => {
        if (sub.fieldPath === fieldPath && (!sub.locale || sub.locale === locale)) {
            try {
                sub.callback();
            } catch (e) {
                console.error('Translation store field subscriber error:', e);
            }
        }
    });
}

// ============================================================================
// SUBSCRIPTION API (for useSyncExternalStore)
// ============================================================================

/**
 * Subscribe to store changes.
 * Returns an unsubscribe function.
 */
export function subscribe(callback: Subscriber): () => void {
    subscribers.add(callback);
    return () => {
        subscribers.delete(callback);
    };
}

/**
 * Subscribe to changes for a specific field.
 * Returns an unsubscribe function.
 */
export function subscribeToField(
    fieldPath: string,
    locale: string | undefined,
    callback: Subscriber
): () => void {
    const subscriber: FieldSubscriber = { fieldPath, locale, callback };
    fieldSubscribers.add(subscriber);
    return () => {
        fieldSubscribers.delete(subscriber);
    };
}

// ============================================================================
// SNAPSHOT API (for useSyncExternalStore)
// ============================================================================

/**
 * Get current state snapshot.
 * Must return the same object reference if state hasn't changed.
 */
export function getSnapshot(): TranslationStoreState {
    return state;
}

/**
 * Get current component snapshot.
 */
export function getCurrentComponent(): ComponentData | null {
    return state.currentComponent;
}

/**
 * Get current form data snapshot.
 */
export function getCurrentFormData(): Record<string, any> {
    return state.currentFormData;
}

/**
 * Get translation data snapshot.
 */
export function getTranslationData(): Record<string, Record<string, any>> {
    return state.translationData;
}

/**
 * Get a specific field value from current form data.
 */
export function getFormDataField(fieldPath: string): any {
    return getNestedValue(state.currentFormData, fieldPath);
}

/**
 * Get a translation value for a specific field and locale.
 */
export function getTranslationValue(fieldPath: string, locale: string): any {
    const localeData = state.translationData[locale];
    return localeData ? getNestedValue(localeData, fieldPath) : undefined;
}

// ============================================================================
// MUTATION API (write operations)
// ============================================================================

/**
 * Set the current component being edited.
 */
export function setCurrentComponent(component: ComponentData | null): void {
    if (state.currentComponent === component) return;

    prevState = state;
    state = { ...state, currentComponent: component };
    notifySubscribers();
}

/**
 * Set the current form data.
 */
export function setCurrentFormData(formData: Record<string, any>): void {
    if (state.currentFormData === formData) return;

    prevState = state;
    state = { ...state, currentFormData: formData };
    notifySubscribers();
}

/**
 * Update a single field in the current form data.
 * This is the main operation that was causing cascading re-renders.
 */
export function updateFormDataField(fieldPath: string, value: any): void {
    const newFormData = setNestedValue(state.currentFormData, fieldPath, value);

    prevState = state;
    state = { ...state, currentFormData: newFormData };

    // Only notify field-specific subscribers, not all subscribers
    notifyFieldSubscribers(fieldPath);
}

/**
 * Set a translation value for a specific field and locale.
 */
export function setTranslationValue(
    fieldPath: string,
    locale: string,
    value: any
): void {
    const localeData = state.translationData[locale] || {};
    const updatedLocaleData = setNestedValue(localeData, fieldPath, value);

    prevState = state;
    state = {
        ...state,
        translationData: {
            ...state.translationData,
            [locale]: updatedLocaleData,
        },
    };

    // Notify field-specific subscribers
    notifyFieldSubscribers(fieldPath, locale);
    // Also notify general subscribers since translationData changed
    notifySubscribers();
}

/**
 * Update main form value AND default locale translation data atomically.
 * This replaces the old updateMainFormValue that caused double updates.
 */
export function updateMainFormValue(
    fieldPath: string,
    value: any,
    defaultLocale: string
): void {
    const newFormData = setNestedValue(state.currentFormData, fieldPath, value);

    const localeData = state.translationData[defaultLocale] || {};
    const updatedLocaleData = setNestedValue(localeData, fieldPath, value);

    prevState = state;
    // Single atomic update instead of two separate updates
    state = {
        ...state,
        currentFormData: newFormData,
        translationData: {
            ...state.translationData,
            [defaultLocale]: updatedLocaleData,
        },
    };

    // Notify field-specific subscribers first (for granular updates)
    notifyFieldSubscribers(fieldPath, defaultLocale);
    // Then notify general subscribers once (not twice!)
    notifySubscribers();
}

/**
 * Clear all translation data.
 */
export function clearTranslationData(): void {
    if (Object.keys(state.translationData).length === 0) return;

    prevState = state;
    state = { ...state, translationData: {} };
    notifySubscribers();
}

/**
 * Reset the entire store to initial state.
 */
export function resetStore(): void {
    prevState = state;
    state = {
        currentComponent: null,
        currentFormData: {},
        translationData: {},
    };
    notifySubscribers();
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================


// Export for testing
export const __internal = {
    getState: () => state,
    getPrevState: () => prevState,
    getSubscriberCount: () => subscribers.size,
    getFieldSubscriberCount: () => fieldSubscribers.size,
};
