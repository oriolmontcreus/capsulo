# GitHub OAuth Integration Feasibility Report

**Date**: January 3, 2026  
**Project**: Capsulo CMS  
**Current Authentication**: Fine-Grained Personal Access Tokens (PATs)

---

## Executive Summary

**✅ GitHub OAuth integration is FEASIBLE and RECOMMENDED** for Capsulo CMS. By deploying a Cloudflare Worker to handle the OAuth flow, you can replace the current fine-grained token system with a much more user-friendly "Login with GitHub" button. This approach:

- Maintains the static nature of the production CMS
- Eliminates token management headaches for users
- Provides better token longevity (no expiration for regular OAuth tokens vs. fine-grained token expiration)
- Improves UX significantly

---

## Current Authentication Analysis

### How It Works Now

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Login Page    │────►│  User manually   │────►│  Token stored   │
│ login.astro     │     │  enters PAT      │     │  in localStorage│
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │  GitHub API     │
                                                 │  (with Bearer)  │
                                                 └─────────────────┘
```

### Files Involved

| File | Purpose |
|------|---------|
| `src/pages/admin/login.astro` | Login UI - manual PAT entry |
| `src/lib/auth.ts` | Auth state management & localStorage |
| `src/hooks/use-auth.ts` | React hook for auth state |
| `src/components/admin/AuthProvider.tsx` | React context provider |
| `src/lib/github-api.ts` | GitHub API client using stored token |

### Pain Points with Current Approach

1. **Manual Token Creation**: Users must navigate GitHub settings → Developer settings → Fine-grained tokens
2. **Complex Permission Setup**: Users need to select the correct repository and grant Contents/Metadata/Email permissions
3. **Token Expiration**: Fine-grained tokens have mandatory expiration (max 1 year)
4. **Device Switching**: Users must re-enter or sync tokens across devices
5. **Security UX**: Users handle raw tokens, risking accidental exposure

---

## Proposed GitHub OAuth Solution

### Architecture Overview

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Login Page    │────►│  Cloudflare Worker   │────►│    GitHub       │
│ (Click Button)  │     │  (OAuth Handler)     │     │  Authorization  │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
                                 │                           │
                                 │◄──────────────────────────┘
                                 │   (Authorization Code)
                                 ▼
                        ┌──────────────────────┐
                        │  Worker exchanges    │
                        │  code for token      │
                        └──────────────────────┘
                                 │
                                 │ (Access Token returned)
                                 ▼
                        ┌──────────────────────┐
                        │  Token stored in     │
                        │  localStorage        │
                        └──────────────────────┘
```

### Why a Cloudflare Worker is Required

GitHub OAuth requires a **client_secret** that must NEVER be exposed to the client. Since Capsulo CMS is 100% static in production:

- ❌ Cannot use server-side code in the static site
- ❌ Cannot embed client_secret in JavaScript
- ✅ **Cloudflare Worker acts as a secure backend** for the OAuth exchange

This perfectly aligns with your existing architecture (you already have a `workers/file-upload` worker for R2 storage).

---

## OAuth vs Fine-Grained Token Comparison

| Aspect | Fine-Grained PAT (Current) | GitHub OAuth (Proposed) |
|--------|---------------------------|-------------------------|
| **User Experience** | Manual token creation | "Login with GitHub" button |
| **Setup Complexity** | High (navigate settings, select permissions) | None (just click and authorize) |
| **Token Expiration** | 7-365 days (mandatory) | Never expires (revoked only if unused for 1 year) |
| **Device Switching** | Manual re-entry required | Re-authorize (faster flow) |
| **Permission Scope** | Granular per-repository | `repo` scope (broader, but controllable) |
| **Token Revocation** | User manages in GitHub settings | User can revoke in "Authorized Apps" |
| **Security** | User handles raw tokens | OAuth flow handles token securely |
| **Multi-User Support** | Each user creates own token | Each user authorizes app once |

### Key Insight on Scopes

For CMS operations, you need the `repo` scope which grants:
- Read/write to repository contents
- Access to commit status
- Access to repository metadata

This is slightly broader than a fine-grained token scoped to a single repository, but this tradeoff is worth it for the UX improvement.

---

## Implementation Plan

### Phase 1: Create GitHub OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Configure:
   - **Application name**: `Capsulo CMS`
   - **Homepage URL**: Your production CMS URL
   - **Authorization callback URL**: `https://your-auth-worker.workers.dev/callback`
4. Save the `Client ID` and generate a `Client Secret`

### Phase 2: Create OAuth Worker

Create a new worker at `workers/github-oauth/`:

```typescript
// workers/github-oauth/src/index.ts

interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  ALLOWED_ORIGINS: string;
  FRONTEND_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS(request, env);
    }
    
    // Initiate OAuth flow
    if (url.pathname === '/auth' && request.method === 'GET') {
      return handleAuthStart(env);
    }
    
    // Handle callback from GitHub
    if (url.pathname === '/callback' && request.method === 'GET') {
      return handleCallback(request, env);
    }
    
    return new Response('Not found', { status: 404 });
  }
};

function handleAuthStart(env: Env): Response {
  const state = crypto.randomUUID(); // CSRF protection
  
  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', `${env.FRONTEND_URL}/callback`);
  authUrl.searchParams.set('scope', 'repo user:email');
  authUrl.searchParams.set('state', state);
  
  return Response.redirect(authUrl.toString(), 302);
}

async function handleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  if (!code) {
    return Response.redirect(`${env.FRONTEND_URL}/admin/login?error=no_code`);
  }
  
  // Exchange code for token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  
  const tokenData = await tokenResponse.json();
  
  if (tokenData.error) {
    return Response.redirect(`${env.FRONTEND_URL}/admin/login?error=${tokenData.error}`);
  }
  
  // Redirect back to CMS with token
  // Token will be extracted and stored by the frontend
  return Response.redirect(
    `${env.FRONTEND_URL}/admin/oauth-callback?token=${tokenData.access_token}`
  );
}

function handleCORS(request: Request, env: Env): Response {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGINS,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
```

### Phase 3: Update Login Page

Create a new OAuth callback page and update the login page:

```astro
<!-- src/pages/admin/oauth-callback.astro -->
---
import Layout from "../../layouts/main.astro";
---

<Layout content={{ title: "Logging in..." }}>
  <div class="min-h-screen flex items-center justify-center">
    <p>Completing login...</p>
  </div>
  
  <script>
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');
    
    if (token) {
      // Validate token by fetching user info
      fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(user => {
        localStorage.setItem('github_access_token', token);
        localStorage.setItem('github_user_data', JSON.stringify(user));
        window.location.href = '/admin';
      })
      .catch(() => {
        window.location.href = '/admin/login?error=invalid_token';
      });
    } else if (error) {
      window.location.href = `/admin/login?error=${error}`;
    }
  </script>
</Layout>
```

Update login page to add OAuth button:

```astro
<!-- Add to src/pages/admin/login.astro -->
<Button
  type="button"
  variant="default"
  className="w-full"
  onclick={`window.location.href='${AUTH_WORKER_URL}/auth'`}
>
  <svg class="mr-2 h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
    <!-- GitHub logo SVG -->
  </svg>
  Continue with GitHub
</Button>

<div class="text-center text-xs text-muted-foreground">
  or
</div>

<!-- Keep existing manual token input as fallback -->
```

### Phase 4: Update Configuration

Update `capsulo.config.ts`:

```typescript
app: {
  name: "Capsulo CMS",
  version: "1.0.0",
  // Update this to your OAuth worker URL
  authWorkerUrl: "https://capsulo-oauth.your-subdomain.workers.dev",
},
```

---

## Security Considerations

### CSRF Protection
- Use the `state` parameter in OAuth flow
- Validate state on callback to prevent cross-site attacks

### Token Storage
- Continue using `localStorage` (same as current implementation)
- Consider adding token refresh mechanism for long sessions
- Tokens are automatically revoked by GitHub if exposed in public repos

### Scope Limitation
OAuth `repo` scope is broader than fine-grained tokens. To mitigate:
- Document that users should authorize with an account that only has access to the CMS repository
- Consider using **GitHub Apps** instead (even more granular, but more complex to set up)

---

## Alternative: GitHub Apps (More Advanced)

GitHub Apps offer even better security than OAuth Apps:

| Feature | OAuth App | GitHub App |
|---------|-----------|------------|
| Token Expiration | Never (unless unused) | 8 hours (with refresh tokens) |
| Permission Granularity | Scope-based | Per-permission settings |
| Installation | User authorizes | Installed on repository |
| Rate Limits | 5,000/hour | 5,000/hour per installation |

**Recommendation**: Start with OAuth App for simplicity. Migrate to GitHub App later if more granular control is needed.

---

## Implementation Effort Estimate

| Task | Effort | Priority |
|------|--------|----------|
| Create GitHub OAuth App in settings | 15 min | High |
| Create OAuth Worker (new directory) | 2-3 hours | High |
| Create OAuth callback page | 30 min | High |
| Update login page UI | 1 hour | High |
| Update configuration | 15 min | High |
| Testing & debugging | 2-3 hours | High |
| Documentation updates | 1 hour | Medium |
| **Total** | **~8-10 hours** | |

---

## Recommended Next Steps

1. **Create a GitHub OAuth App** in your/organization's GitHub settings
2. **Create the OAuth Worker** in `workers/github-oauth/`
3. **Configure Worker secrets** with Wrangler:
   ```bash
   wrangler secret put GITHUB_CLIENT_ID
   wrangler secret put GITHUB_CLIENT_SECRET
   ```
4. **Deploy Worker** to Cloudflare
5. **Update login page** with OAuth button
6. **Create callback page** to handle token
7. **Test the complete flow**
8. **Keep manual token entry as fallback** for advanced users/debugging

---

## Files To Create/Modify

### New Files
- `workers/github-oauth/` (entire worker directory)
- `src/pages/admin/oauth-callback.astro`

### Modified Files
- `src/pages/admin/login.astro` (add OAuth button)
- `capsulo.config.ts` (add OAuth worker URL)
- `docs/DEV_VS_PROD_MODES.md` (update authentication section)

---

## Conclusion

GitHub OAuth integration is not only feasible but highly recommended for Capsulo CMS. The implementation:

- ✅ Keeps the CMS 100% static in production
- ✅ Uses Cloudflare Workers (consistent with existing architecture)
- ✅ Dramatically improves user experience
- ✅ Eliminates token expiration headaches
- ✅ Maintains security through standard OAuth flow
- ✅ Can keep manual token entry as fallback

The estimated effort of 8-10 hours is a worthwhile investment for the significant UX improvement and reduced user friction.
