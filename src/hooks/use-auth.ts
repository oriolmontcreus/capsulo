import { useState, useEffect, useCallback, useMemo } from 'react';
import type { AuthState, GitHubUser } from '../lib/auth';
import { getStoredAuthData, clearAuthData, storeAuthData } from '../lib/auth';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load auth state from localStorage on mount
    const storedAuth = getStoredAuthData();
    setAuthState(storedAuth);
    setLoading(false);
  }, []);

  const login = useCallback((token: string, user: GitHubUser) => {
    storeAuthData(token, user);
    setAuthState({
      isAuthenticated: true,
      user,
      token,
    });
  }, []);

  const logout = useCallback(() => {
    clearAuthData();
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
    });
  }, []);

  return useMemo(() => ({
    ...authState,
    loading,
    login,
    logout,
  }), [authState, loading, login, logout]);
}