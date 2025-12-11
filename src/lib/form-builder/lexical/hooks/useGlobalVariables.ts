import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/form-builder/context/TranslationContext';
import { loadGlobalVariables } from '../utils/global-variables';
import type { VariableItem } from '../../types';

export const useGlobalVariables = (contextLocale?: string) => {
    const [variables, setVariables] = useState<VariableItem[]>([]);
    const { defaultLocale } = useTranslation();

    // Use passed locale or fallback to default
    const targetLocale = contextLocale || defaultLocale;

    useEffect(() => {
        let isMounted = true;

        const fetchVariables = async () => {
            try {
                const data = await loadGlobalVariables();
                const globals = data.variables?.find((v: any) => v.id === 'globals');

                if (globals && globals.data) {
                    const items = Object.entries(globals.data).map(([key, item]: [string, any]) => {
                        let displayValue = '';
                        const val = item.value;

                        if (typeof val === 'string') {
                            displayValue = val;
                        } else if (typeof val === 'object' && val !== null) {
                            // Handle localized values securely:
                            // Check if the object looks like a translation map (has target or default locale keys)
                            // This prevents treating arbitrary objects (like arrays or complex non-localized data) as maps.
                            if (targetLocale in val || defaultLocale in val) {
                                const localizedVal = val[targetLocale] || val[defaultLocale];
                                displayValue = typeof localizedVal === 'string' ? localizedVal : JSON.stringify(localizedVal);
                            } else {
                                // Fallback for complex objects that aren't localized maps
                                displayValue = JSON.stringify(val);
                            }
                        } else {
                            // Fallback for numbers, booleans, etc.
                            displayValue = String(val);
                        }

                        return {
                            key,
                            value: displayValue,
                            scope: 'Global' as const
                        };
                    });
                    if (isMounted) {
                        setVariables(items);
                    }
                } else {
                    // Explicitly set empty array when no globals are found
                    if (isMounted) {
                        setVariables([]);
                    }
                }
            } catch (error) {
                console.error('Failed to load global variables', error);
                // Set empty array on error to keep state in sync
                if (isMounted) {
                    setVariables([]);
                }
            }
        };
        fetchVariables();

        return () => {
            isMounted = false;
        };
    }, [targetLocale, defaultLocale]);

    return variables;
};
