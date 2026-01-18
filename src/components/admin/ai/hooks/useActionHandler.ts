import * as React from "react";
import type { AIAction, UIMessage } from "@/lib/ai/types";
import { getPageDraft, getGlobalsDraft } from "@/lib/cms-local-changes";
import { sanitizeActionData } from "../utils/sanitization";
import { chatStorage } from "@/lib/ai/chat-storage";

/**
 * Hook to handle applying AI actions to components
 */
export function useActionHandler(defaultLocale: string) {
    const handleApplyAction = React.useCallback(async (
        messageId: string,
        actionData: AIAction,
        setMessages: React.Dispatch<React.SetStateAction<UIMessage[]>>,
        context: { pageData: any, globalData: any, selectedPage?: string, conversationId?: string | null }
    ) => {
        if (!actionData || !actionData.componentId || !actionData.data) return;

        // Find the component to capture previous state
        let previousData = null;
        let schemaName = null;
        
        const pageId = context.selectedPage;
        if (pageId) {
            try {
                const draftData = await getPageDraft(pageId);
                if (draftData?.components) {
                    const draftComponent = draftData.components.find((c: any) => c.id === actionData.componentId);
                    if (draftComponent) {
                        previousData = structuredClone(draftComponent.data || {});
                        schemaName = draftComponent.schemaName;
                    }
                }
            } catch (error) {
                console.warn('[useActionHandler] Could not fetch draft data, falling back to context:', error);
            }
        }
        
        if (!previousData) {
            const pageComponent = context.pageData?.components?.find((c: any) => c.id === actionData.componentId);
            if (pageComponent) {
                previousData = structuredClone(pageComponent.data || {});
                schemaName = pageComponent.schemaName;
            } 
        }

        if (!previousData) {
            try {
                const globalsDraft = await getGlobalsDraft();
                if (globalsDraft?.variables) {
                    const draftGlobal = globalsDraft.variables.find((c: any) => c.id === actionData.componentId);
                    if (draftGlobal) {
                        previousData = structuredClone(draftGlobal.data || {});
                        schemaName = draftGlobal.schemaName;
                    }
                }
            } catch (error) {
                console.warn('[useActionHandler] Could not fetch globals draft, falling back to context:', error);
            }
            
            if (!previousData && context.globalData?.variables) {
                const globalComponent = context.globalData.variables.find((c: any) => c.id === actionData.componentId);
                if (globalComponent) {
                    previousData = structuredClone(globalComponent.data || {});
                    schemaName = globalComponent.schemaName;
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

        // Update UI state
        setMessages(prev => {
            const newMessages = prev.map(m => 
                m.id === messageId ? { 
                    ...m, 
                    actionApplied: true,
                    previousData,
                    schemaName
                } : m
            );

            // Persist to storage if we have a conversationId
            if (context.conversationId) {
                const updatedMsg = newMessages.find(m => m.id === messageId);
                if (updatedMsg) {
                    // We only save the persisted fields (Message type)
                    const { conversationId, isStreaming, hasAction, parseError, ...persistedFields } = updatedMsg as any;
                    chatStorage.addMessage(context.conversationId, persistedFields).catch(err => {
                        console.error('[useActionHandler] Failed to persist action update:', err);
                    });
                }
            }

            return newMessages;
        });
    }, [defaultLocale]);

    return { handleApplyAction };
}
