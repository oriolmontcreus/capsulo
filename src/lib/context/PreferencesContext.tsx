import React, { createContext, useContext, useState, useEffect } from 'react';

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

    const shouldConfirm = (action: ConfirmationAction): boolean => {
        return confirmations[action] ?? true;
    };

    const setConfirmation = (action: ConfirmationAction, enabled: boolean) => {
        setConfirmations(prev => ({ ...prev, [action]: enabled }));
    };

    return (
        <PreferencesContext.Provider value={{ confirmations, shouldConfirm, setConfirmation }}>
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
