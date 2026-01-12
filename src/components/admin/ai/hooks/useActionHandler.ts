import * as React from "react";
import type { AIAction } from "@/lib/ai/types";

/**
 * Sanitizes AI action data by:
 * 1. Unwrapping internal structure (e.g., { type: "...", value: "..." })
 * 2. Unwrapping translation objects to extract the appropriate locale value
 * 3. Filtering out forbidden keys for security
 */
export function sanitizeActionData(
    actionData: Record<string, any>,
    defaultLocale: string
): Record<string, any> {
    const sanitizedData: Record<string, any> = {};
    const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);
    
    Object.entries(actionData).forEach(([key, value]: [string, any]) => {
        if (forbiddenKeys.has(key)) return;
        let cleanValue = value;

        // Unwrap internal structure
        if (value && typeof value === 'object' && 'value' in value && 'type' in value) {
            cleanValue = value.value;
        }

        // Unwrap translation object if incorrectly sent as object
        // Validate that keys are real locale codes (e.g., 'en', 'es', 'en-US', 'pt-BR')
        // and values are strings (expected translation shape)
        if (cleanValue && typeof cleanValue === 'object' && !Array.isArray(cleanValue)) {
            const keys = Object.keys(cleanValue);
            // Locale pattern: 2-letter language code, optionally followed by dash and 2+ letter region
            const localePattern = /^[a-z]{2}(-[A-Z]{2,})?$/;
            const allKeysAreLocales = keys.length > 0 && keys.every(k => localePattern.test(k));
            const hasStringValue = keys.some(k => typeof cleanValue[k] === 'string');
            
            if (allKeysAreLocales && hasStringValue) {
                // Pick default locale or first available
                cleanValue = cleanValue[defaultLocale] || cleanValue[keys[0]];
            }
        }

        sanitizedData[key] = cleanValue;
    });

    return sanitizedData;
}

/**
 * Hook to handle applying AI actions to components
 */
export function useActionHandler(defaultLocale: string) {
    const handleApplyAction = React.useCallback(async (
        messageId: string,
        actionData: AIAction,
        setMessages: React.Dispatch<React.SetStateAction<any[]>>,
        context: { pageData: any, globalData: any }
    ) => {
        if (!actionData || !actionData.componentId || !actionData.data) return;

        // Find the component to capture previous state
        let previousData = null;
        let schemaName = null;
        
        // Search in page data
        const pageComponent = context.pageData?.components?.find((c: any) => c.id === actionData.componentId);
        if (pageComponent) {
            previousData = JSON.parse(JSON.stringify(pageComponent.data || {}));
            schemaName = pageComponent.schemaName;
        } 
        // Search in globals if not found in page
        else if (context.globalData?.variables) {
            const globalComponent = context.globalData.variables.find((c: any) => c.id === actionData.componentId);
            if (globalComponent) {
                previousData = JSON.parse(JSON.stringify(globalComponent.data || {}));
                schemaName = globalComponent.schemaName;
            }
        }

        const sanitizedData = sanitizeActionData(actionData.data, defaultLocale);

        window.dispatchEvent(new CustomEvent('cms-ai-update-component', {
            detail: {
                componentId: actionData.componentId,
                data: sanitizedData
            }
        }));

        setMessages(prev => prev.map(m => 
            m.id === messageId ? { 
                ...m, 
                actionApplied: true,
                previousData,
                schemaName
            } : m
        ));
    }, [defaultLocale]);

    return { handleApplyAction };
}
