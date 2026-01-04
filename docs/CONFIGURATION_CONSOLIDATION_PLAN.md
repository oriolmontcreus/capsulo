# Configuration Consolidation Plan

**Date**: January 4, 2026
**Project**: Capsulo CMS

## Problem
Currently, configuration and secrets are fragmented across multiple files, leading to a confusing developer experience and potential synchronization errors:
1. **`.env`** (Root): Frontend environment variables (public config).
2. **`workers/github-oauth/.dev.vars`** (Worker): Secrets for the OAuth worker (Client ID/Secret).
3. **`capsulo.config.ts`** (App): Typescript configuration file that partially duplicates or ignores env vars.
4. **`wrangler.toml`** (Worker): Worker-specific environment config.

## Proposed Goal
Establish a **Single Source of Truth** for local development configuration: the root `.env` file.

## Solution

### 1. Unified `.env` File
We will expand the root `.env` to include *all* necessary local configuration, including secrets that were previously only in `.dev.vars`.

**New `.env` Structure:**
```properties
# --- Public App Config ---
PUBLIC_APP_NAME=Capsulo CMS
...

# --- GitHub Config ---
GITHUB_REPO_OWNER=oriolmontcreus
GITHUB_REPO_NAME=capsulo

# --- Local Secrets (Synced to Worker) ---
# These are used by the sync script to populate .dev.vars
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

### 2. Automated Sync Script (`scripts/sync-env.js`)
We will create a Node.js script that:
1. Reads the root `.env` file.
2. Extracts the secrets required by the worker (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`).
3. specificially writes them to `workers/github-oauth/.dev.vars`.
4. This script involves no manual user interaction.

### 3. Updated `capsulo.config.ts`
Refactor `capsulo.config.ts` to strictly use `import.meta.env` variables instead of hardcoded strings, ensuring it respects the `.env` configuration.

### 4. NPM Script Integration
Update `package.json` to automatically run the sync script before starting the development environment.

```json
"scripts": {
  "sync:env": "node scripts/sync-env.js",
  "dev": "npm run sync:env && astro dev"
}
```

## Benefits
- **One File to Manage**: Developers only need to setup `.env`.
- **Automatic Sync**: No more manual copying of secrets to hidden `.dev.vars` files.
- **Consistency**: `capsulo.config.ts` will always match the environment variables.
