import React, { createContext, useContext, useState, useCallback } from 'react';
import { useTranslation } from './TranslationContext';

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

    // Add instance counter to track re-initializations (only log once)
    const instanceId = React.useId();
    const hasLoggedRef = React.useRef(false);
    if (!hasLoggedRef.current) {
        console.log('📊 TranslationDataProvider initialized:', { instanceId, defaultLocale });
        hasLoggedRef.current = true;
    }



    const setTranslationValue = useCallback((fieldPath: string, locale: string, value: any) => {


        setTranslationData(prev => ({
            ...prev,
            [locale]: {
                ...prev[locale],
                [fieldPath]: value
            }
        }));

        // If this is the default locale, also update the main form data
        if (locale === defaultLocale) {

            setCurrentFormData(prev => ({
                ...prev,
                [fieldPath]: value
            }));
        }
    }, [defaultLocale]);

    const getTranslationValue = useCallback((fieldPath: string, locale: string) => {
        return translationData[locale]?.[fieldPath];
    }, [translationData]);

    const getFieldValue = useCallback((fieldPath: string, locale?: string) => {
        const targetLocale = locale || defaultLocale;



        // First check translation data
        const translationValue = translationData[targetLocale]?.[fieldPath];
        if (translationValue !== undefined) {

            return translationValue;
        }

        // For default locale, check current form data
        if (targetLocale === defaultLocale) {
            const formValue = currentFormData[fieldPath];
            if (formValue !== undefined) {
                console.log('📊 Returning form value for', fieldPath, ':', formValue);
                return formValue;
            }
        }

        // Fallback to component data
        const componentValue = currentComponent?.data[fieldPath]?.value;
        if (componentValue !== undefined) {
            console.log('📊 Returning component value for', fieldPath, ':', componentValue);
        }
        return componentValue;
    }, [translationData, currentFormData, currentComponent, defaultLocale]);

    const updateMainFormValue = useCallback((fieldPath: string, value: any) => {
        setCurrentFormData(prev => ({
            ...prev,
            [fieldPath]: value
        }));

        // Also update the default locale translation data
        setTranslationData(prev => ({
            ...prev,
            [defaultLocale]: {
                ...prev[defaultLocale],
                [fieldPath]: value
            }
        }));
    }, [defaultLocale]);

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