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
    // Structure: { [locale]: { [componentId]: { [fieldPath]: value } } }
    translationData: Record<string, Record<string, Record<string, any>>>;
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
    componentId?: string;
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
function notifyFieldSubscribers(fieldPath: string, locale?: string, componentId?: string): void {
    fieldSubscribers.forEach(sub => {
        if (
            sub.fieldPath === fieldPath &&
            (!sub.locale || sub.locale === locale) &&
            (!sub.componentId || sub.componentId === componentId)
        ) {
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
 * Get a translation value for a specific field and locale.
 */
export function getTranslationValue(fieldPath: string, locale: string, componentId?: string): any {
    const targetComponentId = componentId || state.currentComponent?.id;
    if (!targetComponentId) return undefined;

    const localeData = state.translationData[locale];
    if (!localeData) return undefined;

    const componentData = localeData[targetComponentId];
    return componentData ? getNestedValue(componentData, fieldPath) : undefined;
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

    // Only notify field-specific subscribers
    // We implicitly know this is for the current component
    notifyFieldSubscribers(fieldPath, undefined, state.currentComponent?.id);
}

/**
 * Set a translation value for a specific field and locale.
 */
export function setTranslationValue(
    fieldPath: string,
    locale: string,
    value: any,
    componentId?: string
): void {
    const targetComponentId = componentId || state.currentComponent?.id;

    // Safety check - if we don't have a component ID, we can't scope the data
    if (!targetComponentId) {
        console.warn('[TranslationStore] setTranslationValue called without componentId and no currentComponent set');
        return;
    }

    const localeData = state.translationData[locale] || {};
    const componentData = localeData[targetComponentId] || {};

    // Update the specific component's data
    const updatedComponentData = setNestedValue(componentData, fieldPath, value);

    // Update the locale data with the new component data
    const updatedLocaleData = {
        ...localeData,
        [targetComponentId]: updatedComponentData
    };

    prevState = state;
    state = {
        ...state,
        translationData: {
            ...state.translationData,
            [locale]: updatedLocaleData,
        },
    };

    // Notify field-specific subscribers
    notifyFieldSubscribers(fieldPath, locale, targetComponentId);
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
    defaultLocale: string,
    componentId?: string
): void {
    const targetComponentId = componentId || state.currentComponent?.id;

    // Update current form data (always applies to current editing session)
    const newFormData = setNestedValue(state.currentFormData, fieldPath, value);

    // Update translation data
    let translationData = state.translationData;

    if (targetComponentId) {
        const localeData = state.translationData[defaultLocale] || {};
        const componentData = localeData[targetComponentId] || {};

        const updatedComponentData = setNestedValue(componentData, fieldPath, value);

        const updatedLocaleData = {
            ...localeData,
            [targetComponentId]: updatedComponentData
        };

        translationData = {
            ...state.translationData,
            [defaultLocale]: updatedLocaleData
        };
    }

    prevState = state;
    // Single atomic update instead of two separate updates
    state = {
        ...state,
        currentFormData: newFormData,
        translationData
    };

    // Notify field-specific subscribers first (for granular updates)
    notifyFieldSubscribers(fieldPath, defaultLocale, targetComponentId);
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