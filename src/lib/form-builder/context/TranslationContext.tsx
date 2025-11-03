/**
 * Translation Context Provider
 * 
 * Provides translation state management and utilities throughout the CMS interface.
 * This context manages the translation sidebar, field navigation, and locale configuration.
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type {
    TranslationContextValue,
    TranslationState,
    TranslationStatus,
    I18nConfig
} from '../core/translation.types';
import { getI18nConfig, isTranslationEnabled } from '../core/translation-config';
import { capsuloConfig } from '@/lib/config';

// Translation state reducer
type TranslationAction =
    | { type: 'OPEN_SIDEBAR'; fieldPath: string }
    | { type: 'CLOSE_SIDEBAR' }
    | { type: 'SET_SIDEBAR_WIDTH'; width: number }
    | { type: 'SET_TRANSLATABLE_FIELDS'; fields: string[] }
    | { type: 'NAVIGATE_TO_FIELD'; direction: 'next' | 'prev' }
    | { type: 'SET_FIELD_INDEX'; index: number };

const initialState: TranslationState = {
    sidebarOpen: false,
    sidebarWidth: 400, // Default width
    activeFieldPath: null,
    translatableFields: [],
    currentFieldIndex: -1,
};

function translationReducer(state: TranslationState, action: TranslationAction): TranslationState {
    switch (action.type) {
        case 'OPEN_SIDEBAR': {
            const fieldIndex = state.translatableFields.indexOf(action.fieldPath);
            return {
                ...state,
                sidebarOpen: true,
                activeFieldPath: action.fieldPath,
                currentFieldIndex: fieldIndex,
            };
        }
        case 'CLOSE_SIDEBAR':
            return {
                ...state,
                sidebarOpen: false,
                activeFieldPath: null,
                currentFieldIndex: -1,
            };
        case 'SET_SIDEBAR_WIDTH':
            return {
                ...state,
                sidebarWidth: Math.max(300, Math.min(800, action.width)), // Constrain width
            };
        case 'SET_TRANSLATABLE_FIELDS':
            return {
                ...state,
                translatableFields: action.fields,
                // Reset field index if current field is no longer available
                currentFieldIndex: state.activeFieldPath && action.fields.includes(state.activeFieldPath)
                    ? action.fields.indexOf(state.activeFieldPath)
                    : -1,
            };
        case 'NAVIGATE_TO_FIELD': {
            const { direction } = action;
            const { translatableFields, currentFieldIndex } = state;

            if (translatableFields.length === 0) return state;

            let newIndex: number;
            if (direction === 'next') {
                newIndex = currentFieldIndex < translatableFields.length - 1
                    ? currentFieldIndex + 1
                    : 0; // Wrap to beginning
            } else {
                newIndex = currentFieldIndex > 0
                    ? currentFieldIndex - 1
                    : translatableFields.length - 1; // Wrap to end
            }

            return {
                ...state,
                currentFieldIndex: newIndex,
                activeFieldPath: translatableFields[newIndex],
            };
        }
        case 'SET_FIELD_INDEX':
            return {
                ...state,
                currentFieldIndex: action.index,
                activeFieldPath: state.translatableFields[action.index] || null,
            };
        default:
            return state;
    }
}

// Create the context
const TranslationContext = createContext<TranslationContextValue | null>(null);

// Provider props
interface TranslationProviderProps {
    children: React.ReactNode;
}

/**
 * Translation Context Provider Component
 * 
 * Wraps the CMS interface to provide translation functionality.
 * Loads locale configuration and manages translation state.
 */
export function TranslationProvider({ children }: TranslationProviderProps) {
    const [state, dispatch] = useReducer(translationReducer, initialState);

    // Load i18n configuration
    const i18nConfig: I18nConfig | null = getI18nConfig(capsuloConfig);
    const translationEnabled = isTranslationEnabled(capsuloConfig);

    // Load sidebar width from localStorage on mount
    useEffect(() => {
        const savedWidth = localStorage.getItem('translation-sidebar-width');
        if (savedWidth) {
            const width = parseInt(savedWidth, 10);
            if (!isNaN(width)) {
                dispatch({ type: 'SET_SIDEBAR_WIDTH', width });
            }
        }
    }, []);

    // Save sidebar width to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('translation-sidebar-width', state.sidebarWidth.toString());
    }, [state.sidebarWidth]);

    // Context value functions
    const openTranslationSidebar = useCallback((fieldPath: string) => {
        console.log('openTranslationSidebar called with fieldPath:', fieldPath);
        // Discover all translatable fields when opening sidebar
        const translatableFields = discoverTranslatableFields();
        console.log('Discovered translatable fields:', translatableFields);
        dispatch({ type: 'SET_TRANSLATABLE_FIELDS', fields: translatableFields });
        dispatch({ type: 'OPEN_SIDEBAR', fieldPath });
    }, []);

    // Function to discover translatable fields in the current page
    const discoverTranslatableFields = useCallback(() => {
        const fields: string[] = [];

        console.log('Discovering translatable fields...');

        // Find all translation icons in the DOM (they have data-field-path attributes)
        const translationIcons = document.querySelectorAll('[data-testid="translation-icon"]');
        console.log('Found translation icons:', translationIcons.length);
        translationIcons.forEach((icon) => {
            const fieldPath = icon.getAttribute('data-field-path');
            console.log('Translation icon field path:', fieldPath);
            if (fieldPath && !fields.includes(fieldPath)) {
                fields.push(fieldPath);
            }
        });

        // Fallback: scan for translatable fields by looking for globe icons
        if (fields.length === 0) {
            console.log('No translation icons found, trying fallback method...');
            const globeIcons = document.querySelectorAll('button[title*="Translate field"]');
            console.log('Found globe icons:', globeIcons.length);
            globeIcons.forEach((icon) => {
                const title = icon.getAttribute('title');
                console.log('Globe icon title:', title);
                if (title) {
                    const match = title.match(/Translate field: ([^(]+)/);
                    if (match && match[1]) {
                        const fieldPath = match[1].trim();
                        console.log('Extracted field path:', fieldPath);
                        if (!fields.includes(fieldPath)) {
                            fields.push(fieldPath);
                        }
                    }
                }
            });
        }

        console.log('Final discovered fields:', fields);
        return fields;
    }, []);

    const closeTranslationSidebar = useCallback(() => {
        dispatch({ type: 'CLOSE_SIDEBAR' });
    }, []);

    const navigateToField = useCallback((direction: 'next' | 'prev') => {
        dispatch({ type: 'NAVIGATE_TO_FIELD', direction });
    }, []);

    const getTranslationStatus = useCallback((fieldPath: string): TranslationStatus => {
        // TODO: This will need access to the current component data
        // For now, return missing as a placeholder
        // In a real implementation, this would:
        // 1. Get the current component data from form state
        // 2. Extract the field value for the given fieldPath
        // 3. Use calculateTranslationStatus to determine status
        return 'missing';
    }, []);

    // If translations are not enabled, provide a minimal context
    if (!translationEnabled || !i18nConfig) {
        console.log('Translation system disabled:', { translationEnabled, hasI18nConfig: !!i18nConfig });
        const disabledContext: TranslationContextValue = {
            currentLocale: 'en',
            availableLocales: ['en'],
            defaultLocale: 'en',
            isTranslationMode: false,
            activeTranslationField: null,
            openTranslationSidebar: () => { },
            closeTranslationSidebar: () => { },
            navigateToField: () => { },
            getTranslationStatus: () => 'missing',
        };

        return (
            <TranslationContext.Provider value={disabledContext}>
                {children}
            </TranslationContext.Provider>
        );
    }

    // Create context value
    const contextValue: TranslationContextValue = {
        currentLocale: i18nConfig.defaultLocale,
        availableLocales: i18nConfig.locales,
        defaultLocale: i18nConfig.defaultLocale,
        isTranslationMode: state.sidebarOpen,
        activeTranslationField: state.activeFieldPath,
        openTranslationSidebar,
        closeTranslationSidebar,
        navigateToField,
        getTranslationStatus,
    };

    console.log('Translation system enabled:', {
        defaultLocale: i18nConfig.defaultLocale,
        availableLocales: i18nConfig.locales,
        isTranslationMode: state.sidebarOpen,
        activeTranslationField: state.activeFieldPath
    });

    return (
        <TranslationContext.Provider value={contextValue}>
            {children}
        </TranslationContext.Provider>
    );
}

/**
 * Hook to use the translation context
 * 
 * @throws Error if used outside of TranslationProvider
 */
export function useTranslation(): TranslationContextValue {
    const context = useContext(TranslationContext);

    if (!context) {
        throw new Error('useTranslation must be used within a TranslationProvider');
    }

    return context;
}

/**
 * Hook to access translation state (internal state management)
 * 
 * This hook provides access to the internal translation state for components
 * that need to manage the sidebar, field navigation, etc.
 */
export function useTranslationState() {
    const [state, dispatch] = useReducer(translationReducer, initialState);

    return {
        state,
        dispatch,
        setSidebarWidth: (width: number) => dispatch({ type: 'SET_SIDEBAR_WIDTH', width }),
        setTranslatableFields: (fields: string[]) => dispatch({ type: 'SET_TRANSLATABLE_FIELDS', fields }),
        setFieldIndex: (index: number) => dispatch({ type: 'SET_FIELD_INDEX', index }),
    };
}