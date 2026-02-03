import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export type ConfirmationAction = 'deleteRepeaterItem' | 'undoAllChanges';

interface ConfirmationPreferences {
    [key: string]: boolean;
}

interface PreferencesContextType {
    confirmations: ConfirmationPreferences;
    shouldConfirm: (action: ConfirmationAction) => boolean;
    setConfirmation: (action: ConfirmationAction, enabled: boolean) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const STORAGE_KEY = 'capsulo-preferences';

const defaultConfirmations: ConfirmationPreferences = {
    deleteRepeaterItem: true,
    undoAllChanges: true,
};

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
    const [confirmations, setConfirmations] = useState<ConfirmationPreferences>(defaultConfirmations);

    // Load preferences from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setConfirmations({ ...defaultConfirmations, ...parsed.confirmations });
            } catch (e) {
                console.error('Failed to parse preferences:', e);
            }
        }
    }, []);

    // Save preferences to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ confirmations }));
    }, [confirmations]);

    const shouldConfirm = useCallback((action: ConfirmationAction): boolean => {
        return confirmations[action] ?? true;
    }, [confirmations]);

    const setConfirmation = useCallback((action: ConfirmationAction, enabled: boolean) => {
        setConfirmations(prev => ({ ...prev, [action]: enabled }));
    }, []);

    const value = useMemo(() => ({
        confirmations,
        shouldConfirm,
        setConfirmation,
    }), [confirmations, shouldConfirm, setConfirmation]);

    return (
        <PreferencesContext.Provider value={value}>
            {children}
        </PreferencesContext.Provider>
    );
}

export function usePreferences() {
    const context = useContext(PreferencesContext);
    if (!context) {
        throw new Error('usePreferences must be used within PreferencesProvider');
    }
    return context;
}
