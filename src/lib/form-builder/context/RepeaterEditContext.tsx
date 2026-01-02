import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { RepeaterField } from '../fields/Repeater/repeater.types';

interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

interface RepeaterEditState {
    isOpen: boolean;
    fieldPath?: string;
    itemIndex?: number;
    fieldName?: string;
    itemName?: string;
    totalItems?: number;
    field?: RepeaterField;
    items?: any[];
    onSave?: (index: number, updatedItem: any) => void;
    fieldErrors?: Record<string, string>;
    componentData?: ComponentData;
    formData?: Record<string, any>;
}

interface RepeaterEditContextValue {
    editState: RepeaterEditState | null;
    openEdit: (
        fieldPath: string,
        itemIndex: number,
        fieldName: string,
        itemName: string,
        totalItems: number,
        field: RepeaterField,
        items: any[],
        onSave: (index: number, updatedItem: any) => void,
        fieldErrors?: Record<string, string>,
        componentData?: ComponentData,
        formData?: Record<string, any>
    ) => void;
    closeEdit: () => void;
    navigateToItem: (newIndex: number) => void;
    updateItems: (newItems: any[]) => void;
}

const RepeaterEditContext = createContext<RepeaterEditContextValue | undefined>(undefined);

export function RepeaterEditProvider({ children }: { children: React.ReactNode }) {
    const [editState, setEditState] = useState<RepeaterEditState | null>(null);

    const openEdit = useCallback((
        fieldPath: string,
        itemIndex: number,
        fieldName: string,
        itemName: string,
        totalItems: number,
        field: RepeaterField,
        items: any[],
        onSave: (index: number, updatedItem: any) => void,
        fieldErrors?: Record<string, string>,
        componentData?: ComponentData,
        formData?: Record<string, any>
    ) => {
        setEditState({
            isOpen: true,
            fieldPath,
            itemIndex,
            fieldName,
            itemName,
            totalItems,
            field,
            items,
            onSave,
            fieldErrors,
            componentData,
            formData,
        });
    }, []);

    const closeEdit = useCallback(() => {
        setEditState(null);
    }, []);

    const navigateToItem = useCallback((newIndex: number) => {
        setEditState(prev => {
            if (prev && prev.totalItems !== undefined) {
                if (newIndex >= 0 && newIndex < prev.totalItems) {
                    return { ...prev, itemIndex: newIndex };
                }
            }
            return prev;
        });
    }, []);

    const updateItems = useCallback((newItems: any[]) => {
        setEditState(prev => {
            if (prev) {
                return { ...prev, items: newItems, totalItems: newItems.length };
            }
            return prev;
        });
    }, []);

    const value = useMemo(() => ({
        editState,
        openEdit,
        closeEdit,
        navigateToItem,
        updateItems,
    }), [editState, openEdit, closeEdit, navigateToItem, updateItems]);

    return (
        <RepeaterEditContext.Provider value={value}>
            {children}
        </RepeaterEditContext.Provider>
    );
}

export function useRepeaterEdit() {
    const context = useContext(RepeaterEditContext);
    if (context === undefined) {
        throw new Error('useRepeaterEdit must be used within a RepeaterEditProvider');
    }
    return context;
}

