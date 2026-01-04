import { useEffect, useCallback } from 'react';
import { isTokenExpiringSoon, refreshToken, getRefreshToken } from '@/lib/auth';
import capsuloConfig from '@/capsulo.config';

/**
 * Hook for automatic token refresh
 * 
 * This hook periodically checks if the access token is expiring soon
 * and automatically refreshes it using the refresh token.
 * 
 * For GitHub App tokens, access tokens expire after 8 hours.
 * This hook will refresh the token 5 minutes before expiry.
 * 
 * Note: This hook does nothing for manual PAT tokens (which don't have refresh tokens)
 */
export function useTokenRefresh() {
    const performRefresh = useCallback(async () => {
        // Only attempt refresh if we have a refresh token (GitHub App tokens)
        if (!getRefreshToken()) return;

        if (isTokenExpiringSoon()) {
            console.log('[TokenRefresh] Token expiring soon, attempting refresh...');
            const success = await refreshToken(capsuloConfig.app.authWorkerUrl);

            if (success) {
                console.log('[TokenRefresh] Token refreshed successfully');
            } else {
                console.warn('[TokenRefresh] Token refresh failed, redirecting to login...');
                // Token refresh failed - redirect to login
                window.location.href = '/admin/login';
            }
        }
    }, []);

    useEffect(() => {
        // Check immediately on mount
        performRefresh();

        // Then check every minute
        const interval = setInterval(performRefresh, 60 * 1000);

        return () => clearInterval(interval);
    }, [performRefresh]);
}
