import React, { createContext, useContext, useState, useCallback } from 'react';
import { useTranslation } from './TranslationContext';
import { getNestedValue, setNestedValue } from '../core/fieldHelpers';

interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

interface TranslationDataContextValue {
    // Current component being edited
    currentComponent: ComponentData | null;
    setCurrentComponent: (component: ComponentData | null) => void;

    // Form data for the current component (includes unsaved changes)
    currentFormData: Record<string, any>;
    setCurrentFormData: (data: Record<string, any>) => void;

    // Translation data (locale -> field -> value)
    translationData: Record<string, Record<string, any>>;
    setTranslationValue: (fieldPath: string, locale: string, value: any) => void;
    getTranslationValue: (fieldPath: string, locale: string) => any;

    // Get the effective value for a field (translation or default)
    getFieldValue: (fieldPath: string, locale?: string) => any;

    // Update the main form data (for default locale binding)
    updateMainFormValue: (fieldPath: string, value: any) => void;

    // Clear all translation data
    clearTranslationData: () => void;
}

const TranslationDataContext = createContext<TranslationDataContextValue | null>(null);

interface TranslationDataProviderProps {
    children: React.ReactNode;
}

export function TranslationDataProvider({
    children
}: TranslationDataProviderProps) {
    const { defaultLocale } = useTranslation();
    const [currentComponent, setCurrentComponent] = useState<ComponentData | null>(null);
    const [currentFormData, setCurrentFormData] = useState<Record<string, any>>({});
    const [translationData, setTranslationData] = useState<Record<string, Record<string, any>>>({});

    const setTranslationValue = useCallback((fieldPath: string, locale: string, value: any) => {
        setTranslationData(prev => {
            const localeData = prev[locale] || {};
            const updatedLocaleData = setNestedValue(localeData, fieldPath, value);
            return {
                ...prev,
                [locale]: updatedLocaleData
            };
        });

        // If this is the default locale, also update the main form data
        if (locale === defaultLocale) {
            setCurrentFormData(prev => setNestedValue(prev, fieldPath, value));
        }
    }, [defaultLocale]);

    const getTranslationValue = useCallback((fieldPath: string, locale: string) => {
        const localeData = translationData[locale];
        return getNestedValue(localeData, fieldPath);
    }, [translationData]);

    const getFieldValue = useCallback((fieldPath: string, locale?: string) => {
        const targetLocale = locale || defaultLocale;

        // First check translation data
        const translationValue = getNestedValue(translationData[targetLocale], fieldPath);
        if (translationValue !== undefined) {
            return translationValue;
        }

        // For default locale ONLY, check current form data and component data
        if (targetLocale === defaultLocale) {
            const formValue = getNestedValue(currentFormData, fieldPath);
            if (formValue !== undefined) {
                return formValue;
            }

            // Fallback to component data for default locale
            // We need to handle the fact that component.data is flat at the top level (field names),
            // but values might be nested (repeater items)

            // Parse the field path to get the top-level field name
            const [fieldName, ...restPath] = fieldPath.split('.');
            const componentFieldData = currentComponent?.data[fieldName];

            if (componentFieldData?.value !== undefined) {
                // Check if value is an object with locale keys (legacy translation format)
                if (typeof componentFieldData.value === 'object' && !Array.isArray(componentFieldData.value) && componentFieldData.value[defaultLocale] !== undefined) {
                    // It's a localized object, get the default locale value
                    const localeValue = componentFieldData.value[defaultLocale];
                    if (restPath.length > 0) {
                        return getNestedValue(localeValue, restPath.join('.'));
                    }
                    return localeValue;
                } else {
                    // Simple value or array (repeater)
                    if (restPath.length > 0) {
                        return getNestedValue(componentFieldData.value, restPath.join('.'));
                    }
                    return componentFieldData.value;
                }
            }
        } else {
            // For non-default locales, also check component data
            const [fieldName, ...restPath] = fieldPath.split('.');
            const componentFieldData = currentComponent?.data[fieldName];

            if (componentFieldData?.value && typeof componentFieldData.value === 'object' && !Array.isArray(componentFieldData.value)) {
                const localeValue = componentFieldData.value[targetLocale];
                if (localeValue !== undefined) {
                    if (restPath.length > 0) {
                        return getNestedValue(localeValue, restPath.join('.'));
                    }
                    return localeValue;
                }
            }
        }

        // For non-default locales, return undefined if no translation exists
        return undefined;
    }, [translationData, currentFormData, currentComponent, defaultLocale]);

    const updateMainFormValue = useCallback((fieldPath: string, value: any) => {
        setCurrentFormData(prev => setNestedValue(prev, fieldPath, value));

        // Also update the default locale translation data
        setTranslationData(prev => {
            const localeData = prev[defaultLocale] || {};
            const updatedLocaleData = setNestedValue(localeData, fieldPath, value);
            return {
                ...prev,
                [defaultLocale]: updatedLocaleData
            };
        });
    }, [defaultLocale]);

    const clearTranslationData = useCallback(() => {
        setTranslationData({});
    }, []);

    const contextValue: TranslationDataContextValue = React.useMemo(() => ({
        currentComponent,
        setCurrentComponent,
        currentFormData,
        setCurrentFormData,
        translationData,
        setTranslationValue,
        getTranslationValue,
        getFieldValue,
        updateMainFormValue,
        clearTranslationData,
    }), [
        currentComponent,
        setCurrentComponent,
        currentFormData,
        setCurrentFormData,
        translationData,
        setTranslationValue,
        getTranslationValue,
        getFieldValue,
        updateMainFormValue,
        clearTranslationData,
    ]);

    return (
        <TranslationDataContext.Provider value={contextValue}>
            {children}
        </TranslationDataContext.Provider>
    );
}

export function useTranslationData(): TranslationDataContextValue {
    const context = useContext(TranslationDataContext);
    if (!context) {
        throw new Error('useTranslationData must be used within a TranslationDataProvider');
    }
    return context;
}