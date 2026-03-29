import React, { createContext, useContext } from 'react';

/**
 * CMS draft scope for persisting picked files to IndexedDB (page id or "globals").
 */
const CmsDraftPageIdContext = createContext<string | null>(null);

export function CmsDraftPageIdProvider({
    pageId,
    children,
}: {
    pageId: string | null;
    children: React.ReactNode;
}) {
    return (
        <CmsDraftPageIdContext.Provider value={pageId}>{children}</CmsDraftPageIdContext.Provider>
    );
}

export function useCmsDraftPageId(): string | null {
    return useContext(CmsDraftPageIdContext);
}
