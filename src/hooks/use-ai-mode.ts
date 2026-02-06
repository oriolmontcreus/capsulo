import { useCallback, useEffect, useState } from "react";
import { AIMode } from "@/lib/ai/modelConfig";
import {
  getStoredMode,
  setStoredMode,
  subscribeToModeChanges,
} from "@/lib/ai/modelConfig";

/**
 * React hook for managing global AI mode
 * Persists to localStorage and syncs across tabs
 */
export function useAIMode() {
  const [mode, setModeState] = useState<AIMode>(AIMode.FAST);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load mode from localStorage on mount
  useEffect(() => {
    const storedMode = getStoredMode();
    setModeState(storedMode);
    setIsLoaded(true);

    // Subscribe to changes from other tabs/components
    const unsubscribe = subscribeToModeChanges((newMode) => {
      setModeState(newMode);
    });

    return unsubscribe;
  }, []);

  // Set mode (persists to localStorage)
  const setMode = useCallback((newMode: AIMode) => {
    setModeState(newMode);
    setStoredMode(newMode);
  }, []);

  // Toggle between modes
  const toggleMode = useCallback(() => {
    const newMode = mode === AIMode.FAST ? AIMode.SMART : AIMode.FAST;
    setMode(newMode);
  }, [mode, setMode]);

  return {
    mode,
    setMode,
    toggleMode,
    isLoaded,
    isFast: mode === AIMode.FAST,
    isSmart: mode === AIMode.SMART,
  };
}
