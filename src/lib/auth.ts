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
  USER_DATA: 'github_user_data',
} as const;/**

/**
 * Store authentication data in localStorage
 */
export function storeAuthData(token: string, user: GitHubUser): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
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
 * Clear authentication data
 */
export function clearAuthData(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  }
}