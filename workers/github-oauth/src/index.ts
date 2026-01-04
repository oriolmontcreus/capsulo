/**
 * Cloudflare Worker for handling GitHub OAuth authentication
 * 
 * This worker securely handles the OAuth flow by:
 * 1. Initiating the OAuth flow with GitHub
 * 2. Receiving the authorization code callback
 * 3. Exchanging the code for an access token (server-side, keeping client_secret secure)
 * 4. Redirecting back to the frontend with the token
 */

export interface Env {
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
    ALLOWED_ORIGINS: string;
    FRONTEND_URL: string;
    ENVIRONMENT?: string; // 'production' | 'development' - controls health check detail level
}

interface GitHubTokenResponse {
    access_token?: string;
    token_type?: string;
    scope?: string;
    error?: string;
    error_description?: string;
}

interface GitHubUser {
    id: number;
    login: string;
    name: string;
    email: string;
    avatar_url: string;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return handleCORS(request, env);
        }

        // Health check endpoint
        if (url.pathname === '/health' && request.method === 'GET') {
            return handleHealthCheck(env);
        }

        // Initiate OAuth flow
        if (url.pathname === '/auth' && request.method === 'GET') {
            return handleAuthStart(request, env);
        }

        // Handle callback from GitHub
        if (url.pathname === '/callback' && request.method === 'GET') {
            return handleCallback(request, env);
        }

        return new Response('Not found', { status: 404 });
    }
};

/**
 * Health check endpoint to verify worker is running
 * SECURITY: Returns minimal info in production to prevent reconnaissance attacks
 */
function handleHealthCheck(env: Env): Response {
    const configured = !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
    const isProduction = env.ENVIRONMENT === 'production';

    // In production, return only minimal, non-sensitive info
    if (isProduction) {
        return new Response(JSON.stringify({
            status: configured ? 'ok' : 'error',
            timestamp: new Date().toISOString()
        }), {
            status: configured ? 200 : 503,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    // In development, include detailed info for debugging
    return new Response(JSON.stringify({
        status: configured ? 'Worker is properly configured' : 'Missing GitHub OAuth credentials',
        configured,
        hasClientId: !!env.GITHUB_CLIENT_ID,
        hasClientSecret: !!env.GITHUB_CLIENT_SECRET,
        frontendUrl: env.FRONTEND_URL,
        environment: env.ENVIRONMENT || 'development',
        timestamp: new Date().toISOString()
    }), {
        status: configured ? 200 : 503,
        headers: {
            'Content-Type': 'application/json'
        }
    });
}

/**
 * Initiates the OAuth flow by redirecting to GitHub's authorization page
 */
function handleAuthStart(request: Request, env: Env): Response {
    const url = new URL(request.url);

    // Get client-side state if provided (for additional CSRF protection layer)
    const clientState = url.searchParams.get('client_state') || '';

    // Generate a random state for server-side CSRF protection
    const state = crypto.randomUUID();

    // Build GitHub authorization URL
    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', `${getWorkerUrl(request)}/callback`);
    authUrl.searchParams.set('state', state);

    // Create response with redirect
    const response = Response.redirect(authUrl.toString(), 302);

    // Store both server state and client state in cookies for validation
    const headers = new Headers(response.headers);
    headers.append('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);
    headers.append('Set-Cookie', `oauth_client_state=${clientState}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);

    return new Response(response.body, {
        status: 302,
        headers
    });
}

/**
 * Handles the OAuth callback from GitHub
 * Exchanges the authorization code for an access token
 */
async function handleCallback(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    // Parse cookies for state validation
    const cookies = parseCookies(request.headers.get('Cookie') || '');

    // Handle GitHub-side errors
    if (error) {
        console.error('GitHub OAuth error:', error, errorDescription);
        return redirectToFrontend(env, { error, error_description: errorDescription || '' }, cookies);
    }

    // Validate required parameters
    if (!code) {
        return redirectToFrontend(env, { error: 'missing_code', error_description: 'No authorization code received' }, cookies);
    }

    // Validate server-side state (CSRF protection)
    const storedState = cookies['oauth_state'];

    if (!state || state !== storedState) {
        console.error('State mismatch:', { received: state, stored: storedState });
        return redirectToFrontend(env, { error: 'state_mismatch', error_description: 'CSRF validation failed' }, cookies);
    }

    try {
        // Exchange authorization code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Capsulo-CMS-OAuth-Worker'
            },
            body: JSON.stringify({
                client_id: env.GITHUB_CLIENT_ID,
                client_secret: env.GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: `${getWorkerUrl(request)}/callback`
            })
        });

        if (!tokenResponse.ok) {
            const errorBody = await tokenResponse.text().catch(() => 'Could not read response body');
            console.error('Token exchange HTTP error:', {
                status: tokenResponse.status,
                statusText: tokenResponse.statusText,
                body: errorBody
            });
            return redirectToFrontend(env, {
                error: 'token_exchange_http_error',
                error_description: `GitHub auth server returned ${tokenResponse.status} ${tokenResponse.statusText}`
            }, cookies);
        }

        const tokenData: GitHubTokenResponse = await tokenResponse.json();

        if (tokenData.error || !tokenData.access_token) {
            console.error('Token exchange failed:', tokenData);
            return redirectToFrontend(env, {
                error: tokenData.error || 'token_exchange_failed',
                error_description: tokenData.error_description || 'Failed to obtain access token'
            }, cookies);
        }

        // Fetch user info to validate token and get user data
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Capsulo-CMS-OAuth-Worker'
            }
        });

        if (!userResponse.ok) {
            console.error('Failed to fetch user info:', userResponse.status);
            return redirectToFrontend(env, {
                error: 'user_fetch_failed',
                error_description: 'Failed to retrieve user information'
            }, cookies);
        }

        const userData: GitHubUser = await userResponse.json();

        // Redirect to frontend with token, user data, and client state for verification
        return redirectToFrontend(env, {
            token: tokenData.access_token,
            user: JSON.stringify({
                id: userData.id,
                login: userData.login,
                name: userData.name,
                email: userData.email,
                avatar_url: userData.avatar_url
            })
        }, cookies);

    } catch (err) {
        console.error('OAuth callback error:', err);
        return redirectToFrontend(env, {
            error: 'internal_error',
            error_description: 'An unexpected error occurred during authentication'
        }, cookies);
    }
}

/**
 * Redirects back to the frontend
 * SECURITY: Uses URL fragments (#) for sensitive data (tokens) instead of query params
 * - Fragments are never sent to servers
 * - Fragments don't appear in server logs or referer headers
 * - Fragments are not persisted in browser history in most browsers
 * - Errors use query params since they're not sensitive
 * - Includes client_state for client-side CSRF verification
 */
function redirectToFrontend(env: Env, params: Record<string, string>, cookies: Record<string, string> = {}): Response {
    const redirectUrl = new URL(`${env.FRONTEND_URL}/admin/oauth-callback`);

    // Get client state from cookies to pass back for client-side verification
    const clientState = cookies['oauth_client_state'] || '';

    // Separate sensitive data (goes in fragment) from error data (goes in query params)
    const sensitiveKeys = ['token', 'user'];
    const fragmentParams: string[] = [];

    // Include client_state in fragment for client-side CSRF verification
    if (clientState) {
        fragmentParams.push(`state=${encodeURIComponent(clientState)}`);
    }

    for (const [key, value] of Object.entries(params)) {
        if (!value) continue;

        if (sensitiveKeys.includes(key)) {
            // Sensitive data goes in the URL fragment (after #)
            fragmentParams.push(`${key}=${encodeURIComponent(value)}`);
        } else {
            // Non-sensitive data (errors) can go in query params
            redirectUrl.searchParams.set(key, value);
        }
    }

    // Build the final URL with fragment if we have sensitive data
    let finalUrl = redirectUrl.toString();
    if (fragmentParams.length > 0) {
        finalUrl += '#' + fragmentParams.join('&');
    }

    // Clear the oauth cookies
    const headers = new Headers();
    headers.set('Location', finalUrl);
    headers.append('Set-Cookie', 'oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    headers.append('Set-Cookie', 'oauth_client_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    // Prevent caching of the redirect
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    headers.set('Pragma', 'no-cache');

    return new Response(null, {
        status: 302,
        headers
    });
}

/**
 * Gets the worker's public URL from the request
 */
function getWorkerUrl(request: Request): string {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
}

/**
 * Parses cookies from a Cookie header string
 */
function parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};

    if (!cookieHeader) return cookies;

    cookieHeader.split(';').forEach(cookie => {
        const [name, ...valueParts] = cookie.trim().split('=');
        if (name) {
            cookies[name] = valueParts.join('=');
        }
    });

    return cookies;
}

/**
 * Handle CORS preflight requests
 */
function handleCORS(request: Request, env: Env): Response {
    return new Response(null, {
        status: 200,
        headers: getCORSHeaders(request, env)
    });
}

/**
 * Get CORS headers for the response
 */
function getCORSHeaders(request: Request, env: Env): Record<string, string> {
    const origin = request.headers.get('Origin');
    const allowedOrigins = env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4321'];

    const headers: Record<string, string> = {
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
    };

    // Allow the origin if it's in the allowed list or is a localhost URL
    if (origin && (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:'))) {
        headers['Access-Control-Allow-Origin'] = origin;
    }

    return headers;
}
