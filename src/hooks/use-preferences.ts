import { useState, useEffect } from 'react';
import { capsuloConfig } from '@/lib/config';

export interface UserPreferences {
    contentMaxWidth: string;
}

const getDefaultPreferences = (): UserPreferences => ({
    contentMaxWidth: capsuloConfig.ui.contentMaxWidth, // Load from config
});

const STORAGE_KEY = 'cms-user-preferences';
const PREFERENCES_CHANGE_EVENT = 'cms-preferences-changed';

export function usePreferences() {
    const [preferences, setPreferencesState] = useState<UserPreferences>(getDefaultPreferences());
    const [isLoaded, setIsLoaded] = useState(false);

    // Load preferences from localStorage on mount
    useEffect(() => {
        const defaultPrefs = getDefaultPreferences();
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setPreferencesState({ ...defaultPrefs, ...parsed });
            }
        } catch (error) {
            console.error('Failed to load user preferences:', error);
        } finally {
            setIsLoaded(true);
        }

        // Listen for storage events to sync across tabs
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue);
                    setPreferencesState({ ...getDefaultPreferences(), ...parsed });
                } catch (error) {
                    console.error('Failed to sync preferences:', error);
                }
            }
        };

        // Listen for custom event for same-tab updates
        const handlePreferencesChange = (e: Event) => {
            const customEvent = e as CustomEvent<UserPreferences>;
            if (customEvent.detail) {
                setPreferencesState(customEvent.detail);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener(PREFERENCES_CHANGE_EVENT, handlePreferencesChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener(PREFERENCES_CHANGE_EVENT, handlePreferencesChange);
        };
    }, []);

    // Save preferences to localStorage
    const setPreferences = (newPreferences: Partial<UserPreferences>) => {
        const updated = { ...preferences, ...newPreferences };
        setPreferencesState(updated);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            // Dispatch custom event for same-tab updates
            window.dispatchEvent(new CustomEvent(PREFERENCES_CHANGE_EVENT, { detail: updated }));
        } catch (error) {
            console.error('Failed to save user preferences:', error);
        }
    };

    const resetPreferences = () => {
        const defaultPrefs = getDefaultPreferences();
        setPreferencesState(defaultPrefs);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error('Failed to reset user preferences:', error);
        }
    };

    return {
        preferences,
        setPreferences,
        resetPreferences,
        isLoaded,
    };
}
