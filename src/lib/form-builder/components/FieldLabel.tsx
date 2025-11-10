import React, { useMemo, useRef, useEffect, useState } from 'react';
import { FieldLabel as UIFieldLabel } from '@/components/ui/field';
import { TranslationIcon } from '@/components/admin/TranslationIcon';
import { useTranslation } from '../context/TranslationContext';
import { useTranslationData } from '../context/TranslationDataContext';
import type { TranslationStatus } from '../core/translation.types';

interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

interface FieldLabelProps {
    htmlFor?: string;
    required?: boolean;
    children: React.ReactNode;
    fieldPath?: string;
    translatable?: boolean;
    componentData?: ComponentData;
    formData?: Record<string, any>;
    className?: string;
}

/**
 * Enhanced FieldLabel component that automatically includes translation icons
 * for translatable fields when in translation mode.
 */
export const FieldLabel: React.FC<FieldLabelProps> = ({
    htmlFor,
    required,
    children,
    fieldPath,
    translatable = false,
    componentData,
    formData,
    className
}) => {
    // Check if we have translation context available
    let translationContext: any = null;
    let translationDataContext: any = null;
    try {
        translationContext = useTranslation();
        translationDataContext = useTranslationData();
    } catch {
        // Translation context not available, continue without translation features
    }

    // Determine if we should show the translation icon
    const showTranslationIcon = translatable &&
        translationContext &&
        translationContext.isTranslationMode &&
        fieldPath;

    // Debounced translation status calculation
    const [debouncedTranslationStatus, setDebouncedTranslationStatus] = useState<TranslationStatus>('missing');
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastStatusRef = useRef<TranslationStatus>('missing');

    // Calculate translation status (immediate, but not used for rendering)
    const immediateTranslationStatus = useMemo((): TranslationStatus => {
        if (!showTranslationIcon || !componentData || !translationContext || !fieldPath) {
            return 'missing';
        }

        const { availableLocales, defaultLocale } = translationContext;
        const fieldData = componentData.data[fieldPath];

        if (!fieldData) return 'missing';

        // For translatable fields, we always expect translations for ALL locales
        const localeStatus: Record<string, boolean> = {};

        // Initialize all locales as missing
        availableLocales.forEach((locale: string) => {
            localeStatus[locale] = false;
        });

        // Check existing field data
        if (fieldData.value && typeof fieldData.value === 'object' && !Array.isArray(fieldData.value)) {
            // New format with locale keys
            availableLocales.forEach((locale: string) => {
                const localeValue = fieldData.value[locale];
                const hasValue = localeValue !== undefined && localeValue !== null && localeValue !== '';
                localeStatus[locale] = hasValue;
            });
        } else {
            // Simple value format - only counts for default locale
            if (fieldData.value !== undefined && fieldData.value !== null && fieldData.value !== '') {
                localeStatus[defaultLocale] = true;
            }
        }

        // Check translation data context for unsaved changes
        if (translationDataContext?.translationData) {
            availableLocales.forEach((locale: string) => {
                const translationValue = translationDataContext.translationData[locale]?.[fieldPath];
                if (translationValue !== undefined) {
                    const hasValue = translationValue !== null && translationValue !== '';
                    localeStatus[locale] = hasValue;
                }
            });
        }

        // Count how many locales have translations
        const translatedCount = Object.values(localeStatus).filter(Boolean).length;
        return translatedCount === availableLocales.length ? 'complete' : 'missing';
    }, [showTranslationIcon, componentData, translationContext, fieldPath, translationDataContext]);

    // Debounce the translation status updates
    useEffect(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        // Set new timer
        debounceTimerRef.current = setTimeout(() => {
            if (immediateTranslationStatus !== lastStatusRef.current) {
                console.log(`🌐 Translation status changed for ${fieldPath}: ${lastStatusRef.current} → ${immediateTranslationStatus}`);
                setDebouncedTranslationStatus(immediateTranslationStatus);
                lastStatusRef.current = immediateTranslationStatus;
            }
        }, 700);

        // Cleanup on unmount
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [immediateTranslationStatus, fieldPath]);

    // Initialize the status on first render
    useEffect(() => {
        if (lastStatusRef.current !== immediateTranslationStatus) {
            console.log(`🌐 Initial translation status for ${fieldPath}: ${immediateTranslationStatus}`);
            setDebouncedTranslationStatus(immediateTranslationStatus);
            lastStatusRef.current = immediateTranslationStatus;
        }
    }, []);

    const translationStatus = debouncedTranslationStatus;

    // Handle translation icon click
    const handleTranslationClick = () => {
        if (!translationContext || !fieldPath) return;

        console.log(`🌐 Globe icon clicked for ${fieldPath}! Setting up translation context...`);

        // Set the component context before opening translation sidebar
        if (translationDataContext && componentData && formData) {
            console.log(`🌐 Setting current component:`, componentData.id);
            translationDataContext.setCurrentComponent(componentData);
            translationDataContext.setCurrentFormData(formData);
        }

        translationContext.openTranslationSidebar(fieldPath);
    };

    return (
        <UIFieldLabel htmlFor={htmlFor} required={false} className={className}>
            {children}
            {required && <span className="text-red-500/80">*</span>}
            {showTranslationIcon && (
                <TranslationIcon
                    fieldPath={fieldPath}
                    isTranslatable={true}
                    status={translationStatus}
                    onClick={handleTranslationClick}
                />
            )}
        </UIFieldLabel>
    );
};