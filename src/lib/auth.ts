export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: GitHubUser | null;
  token: string | null;
}

// Local storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'github_access_token',
  REFRESH_TOKEN: 'github_refresh_token',
  TOKEN_EXPIRES_AT: 'github_token_expires_at',
  USER_DATA: 'github_user_data',
} as const;

/**
 * Store authentication data in localStorage
 * Supports both GitHub App tokens (with refresh) and manual PAT tokens (without refresh)
 */
export function storeAuthData(
  token: string,
  user: GitHubUser,
  refreshToken?: string,
  expiresIn?: number
): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

  // Store refresh token and expiry if provided (GitHub App tokens)
  if (refreshToken) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }

  if (expiresIn) {
    const expiresAt = Date.now() + (expiresIn * 1000);
    localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt.toString());
  }
}

/**
 * Get stored authentication data
 */
export function getStoredAuthData(): AuthState {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false, user: null, token: null };
  }

  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const userDataString = localStorage.getItem(STORAGE_KEYS.USER_DATA);

  if (!token || !userDataString) {
    return { isAuthenticated: false, user: null, token: null };
  }

  try {
    const user = JSON.parse(userDataString) as GitHubUser;
    return { isAuthenticated: true, user, token };
  } catch {
    return { isAuthenticated: false, user: null, token: null };
  }
}

/**
 * Get the token expiry timestamp
 * Returns null if no expiry is stored (e.g., for manual PAT tokens)
 */
export function getTokenExpiresAt(): number | null {
  if (typeof window === 'undefined') return null;

  const expiresAt = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
  if (!expiresAt) return null;

  return parseInt(expiresAt, 10);
}

/**
 * Check if the token is expiring soon (within 5 minutes)
 * Returns false if no expiry is stored (e.g., for manual PAT tokens that don't expire)
 */
export function isTokenExpiringSoon(): boolean {
  const expiresAt = getTokenExpiresAt();
  if (!expiresAt) return false;

  const fiveMinutes = 5 * 60 * 1000;
  return Date.now() > (expiresAt - fiveMinutes);
}

/**
 * Check if the token is completely expired
 * Returns false if no expiry is stored (e.g., for manual PAT tokens that don't expire)
 */
export function isTokenExpired(): boolean {
  const expiresAt = getTokenExpiresAt();
  if (!expiresAt) return false;

  return Date.now() > expiresAt;
}

/**
 * Get the stored refresh token
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

/**
 * Refresh the access token using the stored refresh token
 * Returns true if refresh was successful, false otherwise
 */
export async function refreshToken(authWorkerUrl: string): Promise<boolean> {
  const storedRefreshToken = getRefreshToken();
  if (!storedRefreshToken) return false;

  try {
    const response = await fetch(`${authWorkerUrl}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: storedRefreshToken }),
    });

    if (!response.ok) {
      console.error('Token refresh failed:', response.status);
      return false;
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (!data.access_token) {
      console.error('Token refresh response missing access_token');
      return false;
    }

    // Update stored tokens
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);

    if (data.refresh_token) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
    }

    if (data.expires_in) {
      const expiresAt = Date.now() + (data.expires_in * 1000);
      localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt.toString());
    }

    return true;
  } catch (error) {
    console.error('Token refresh error:', error);
    return false;
  }
}

/**
 * Clear authentication data
 */
export function clearAuthData(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  }
}