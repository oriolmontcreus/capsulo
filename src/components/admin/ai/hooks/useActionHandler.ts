import * as React from "react";
import type { AIAction } from "@/lib/ai/types";
import { getPageDraft, getGlobalsDraft } from "@/lib/cms-local-changes";
import { sanitizeActionData } from "../utils/sanitization";

/**
 * Hook to handle applying AI actions to components
 */
export function useActionHandler(defaultLocale: string) {
    const handleApplyAction = React.useCallback(async (
        messageId: string,
        actionData: AIAction,
        setMessages: React.Dispatch<React.SetStateAction<any[]>>,
        context: { pageData: any, globalData: any, selectedPage?: string }
    ) => {
        if (!actionData || !actionData.componentId || !actionData.data) return;

        // Find the component to capture previous state
        // IMPORTANT: We need to get the CURRENT data from IndexedDB draft (user's edits)
        // NOT the stale data from the context (which is from the server/cache)
        let previousData = null;
        let schemaName = null;
        
        // Try to get data from IndexedDB draft first (this has the user's current edits)
        const pageId = context.selectedPage;
        if (pageId) {
            try {
                const draftData = await getPageDraft(pageId);
                if (draftData?.components) {
                    const draftComponent = draftData.components.find((c: any) => c.id === actionData.componentId);
                    if (draftComponent) {
                        previousData = JSON.parse(JSON.stringify(draftComponent.data || {}));
                        schemaName = draftComponent.schemaName;
                    }
                }
            } catch (error) {
                console.warn('[useActionHandler] Could not fetch draft data, falling back to context:', error);
            }
        }
        
        // Fall back to context pageData if no draft was found
        if (!previousData) {
            const pageComponent = context.pageData?.components?.find((c: any) => c.id === actionData.componentId);
            if (pageComponent) {
                previousData = JSON.parse(JSON.stringify(pageComponent.data || {}));
                schemaName = pageComponent.schemaName;
            } 
            // Search in globals if not found in page
            else if (context.globalData?.variables) {
                // Try globals draft first
                try {
                    const globalsDraft = await getGlobalsDraft();
                    if (globalsDraft?.variables) {
                        const draftGlobal = globalsDraft.variables.find((c: any) => c.id === actionData.componentId);
                        if (draftGlobal) {
                            previousData = JSON.parse(JSON.stringify(draftGlobal.data || {}));
                            schemaName = draftGlobal.schemaName;
                        }
                    }
                } catch (error) {
                    console.warn('[useActionHandler] Could not fetch globals draft, falling back to context:', error);
                }
                
                // Fall back to context globalData
                if (!previousData) {
                    const globalComponent = context.globalData.variables.find((c: any) => c.id === actionData.componentId);
                    if (globalComponent) {
                        previousData = JSON.parse(JSON.stringify(globalComponent.data || {}));
                        schemaName = globalComponent.schemaName;
                    }
                }
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
