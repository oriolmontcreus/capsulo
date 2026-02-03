# CMS Storage Modes: Development vs Production

The Capsulo CMS now supports two distinct storage modes to optimize the developer experience and production workflow.

## Overview

- **Development Mode**: Direct local file system storage with hot reload
- **Production Mode**: GitHub API with draft branches and pull request workflow

## How It Works

The CMS automatically detects the environment and switches storage backends:

```typescript
import { isDevelopmentMode } from '@/lib/cms-storage-adapter';

if (isDevelopmentMode()) {
  // Use local file system
} else {
  // Use GitHub API
}
```

## Development Mode

### Features
- ✅ **Instant Save**: Changes write directly to `/src/content/pages/*.json`
- ✅ **Hot Reload**: Astro watches for file changes and updates immediately
- ✅ **No Authentication**: No GitHub token required
- ✅ **No Branches**: No draft/publish workflow - changes are immediate
- ✅ **Offline Work**: Works without internet connection

### How Saving Works
1. User clicks "Save changes" in CMS (React component)
2. Client-side call to `/api/cms/save` endpoint (Astro server route)
3. Server writes to `src/content/pages/[page].json`
4. Astro's file watcher detects the change
5. Page auto-reloads with new content (HMR)

### API Endpoints
- `POST /api/cms/save` - Saves page data to local JSON file (server-side)
- `GET /api/cms/load?page=[name]` - Loads page data from local JSON file (server-side)

**Note**: These endpoints are protected and only available in development mode (`import.meta.env.PROD` check).

### File Structure
```
src/content/pages/
├── index.json     # Homepage data
├── about.json     # About page data
└── contact.json   # Contact page data
```

## Production Mode

### Features
- ✅ **Draft Branches**: Each user gets their own draft branch
- ✅ **Review Workflow**: Changes can be reviewed before going live
- ✅ **Publish Button**: Merges draft to main branch
- ✅ **GitHub Actions**: Triggers rebuild on publish
- ✅ **Multi-User**: Multiple users can have separate drafts

### How Saving Works
1. User clicks "Save changes" in CMS
2. Creates/uses draft branch `cms-draft-[username]` (based on GitHub username)
3. Commits to draft branch via GitHub API
4. User clicks "Publish" when ready
5. Merges draft branch to main via GitHub API
6. Deletes draft branch after successful merge
7. GitHub Actions rebuilds and deploys site

### Branch Naming
- Main branch: `main` (or repository's default branch)
- Draft branches: `cms-draft-[github-username]` (e.g., `cms-draft-johndoe`)

**Note**: The username is automatically retrieved from the authenticated GitHub user's profile.

## Configuration

### Environment Detection

The mode is automatically detected based on Astro's environment:
```typescript
export const isDevelopmentMode = (): boolean => {
  return import.meta.env.DEV || import.meta.env.MODE === 'development';
};
```

**How it works:**
- `import.meta.env.DEV` - Astro's built-in development flag
- `import.meta.env.MODE` - Explicitly check for 'development' mode

### No Configuration Needed!
The system automatically switches based on:
- `npm run dev` → Development Mode
- `npm run build` → Production Mode
- Deployed site → Production Mode

## Storage Adapter API

The unified storage adapter provides a consistent interface across both modes:

### `savePage(pageName, data)`
Saves page data to appropriate backend:
- Dev: Makes POST request to `/api/cms/save` (writes to local file)
- Prod: Commits to draft branch via GitHub API

```typescript
import { savePage } from '@/lib/cms-storage-adapter';

await savePage('index', {
  components: [/* ... */]
});
```

### `loadDraft(pageName)`
Loads unpublished changes:
- Dev: Makes GET request to `/api/cms/load` (reads from local file)
- Prod: Fetches from draft branch via GitHub API

```typescript
import { loadDraft } from '@/lib/cms-storage-adapter';

const draftData = await loadDraft('index');
```

### `hasUnpublishedChanges()`
Checks for unpublished changes:
- Dev: Always returns `false` (no drafts)
- Prod: Returns `true` if draft branch exists

```typescript
import { hasUnpublishedChanges } from '@/lib/cms-storage-adapter';

const hasChanges = await hasUnpublishedChanges();
```

### `publish()`
Publishes changes to production:
- Dev: Shows alert "No publish needed in development mode - changes are already live!"
- Prod: Merges draft branch to main

```typescript
import { publish } from '@/lib/cms-storage-adapter';

await publish(); // Alert in dev, merge in production
```

## UI Differences

### Development Mode
- No "Publish" button shown (hidden in dev mode)
- Save button writes directly to local files via API endpoint
- Instant hot reload via Astro's file watcher
- Alert shows: "No publish needed in development mode - changes are already live!" (if publish is attempted)

### Production Mode
- "Publish" button appears when draft changes exist
- Alert shows: "Draft Changes - Your changes are saved to a draft branch. Click publish to make them live."
- Save button writes to draft branch via GitHub API
- Publish button merges to main and triggers rebuild

## Best Practices

### For Developers (Dev Mode)
1. Run `npm run dev`
2. Edit content in CMS at `/admin`
3. Save changes (writes to local files)
4. Changes appear immediately
5. Commit JSON files to git when ready

### For Content Editors (Production)
1. Log in to CMS with GitHub
2. Edit content in CMS
3. Save changes (creates draft)
4. Preview on draft branch URL (if using deployment previews)
5. Click "Publish" when satisfied
6. Site rebuilds automatically

## File Locations

### Development Mode
```
src/
├── content/
│   └── pages/
│       ├── index.json         ← Editable locally
│       └── about.json          ← Editable locally
└── pages/
    ├── index.astro             ← Loads from JSON
    └── about.astro             ← Loads from JSON
```

### Production Mode
```
GitHub Repository
├── main branch
│   └── src/content/pages/*.json       ← Published content
└── cms-draft-[username] branch
    └── src/content/pages/*.json       ← Draft content (user-specific)
```

**Note**: Each user gets their own draft branch based on their GitHub username.

## API Security

The local storage API endpoints are protected and only available in development:

```typescript
// In /api/cms/save.ts and /api/cms/load.ts
if (import.meta.env.PROD) {
  return new Response(
    JSON.stringify({ error: 'This endpoint is only available in development mode' }),
    { status: 403 }
  );
}
```

**Why this matters:**
- Prevents file system access in production builds
- Forces production deployments to use GitHub API
- Protects against unauthorized file modifications
- No security risk when deploying to hosting platforms

This prevents the endpoints from being exploited in production environments.

## Troubleshooting

### Dev Mode: Changes Not Appearing
1. Check browser console for API endpoint errors
2. Verify `/src/content/pages/[page].json` file exists
3. Check file permissions (server needs write access)
4. Ensure Astro dev server is running
5. Try hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
6. Restart dev server if HMR is not working

### Production Mode: Can't Save
1. Verify GitHub token is valid and not expired
2. Check token has required permissions (Contents: Read & Write)
3. Verify repository settings allow branch creation
4. Check network connectivity and GitHub API status
5. Review browser console for detailed error messages

### Mixed Mode Issues
If you see unexpected behavior:
1. Clear browser cache
2. Restart dev server
3. Check `import.meta.env.MODE`
4. Verify no environment variable conflicts

## Migration Between Modes

### Dev → Production
1. Commit your local JSON files to git
2. Push to your repository
3. Deploy your site
4. CMS now uses GitHub API in production

### Production → Dev
1. Pull latest changes from repository
2. JSON files are now in your local filesystem
3. Run `npm run dev`
4. CMS now uses local files in development

## Summary

| Feature | Development Mode | Production Mode |
|---------|-----------------|-----------------|
| Storage | Local file system (via API) | GitHub API |
| Authentication | None required | GitHub OAuth (fine-grained token) |
| Branches | None (direct file writes) | Draft branches (`cms-draft-[username]`) |
| Publish | Instant (no publish step) | Manual publish (merge to main) |
| Hot Reload | Yes (Astro HMR) | No (requires rebuild) |
| Offline | Yes | No (requires GitHub API) |
| Multi-User | Single developer | Multiple editors (separate drafts) |
| Review Workflow | Via Git commits | Via draft branches + merge |
| API Endpoints | `/api/cms/save` & `/api/cms/load` | GitHub REST API |

This dual-mode system provides the best of both worlds: fast iteration during development and a robust review workflow in production.
