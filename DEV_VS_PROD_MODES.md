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
1. User clicks "Save changes" in CMS
2. API call to `/api/cms/save` (server-side endpoint)
3. Writes to `src/content/pages/[page].json`
4. Astro detects file change
5. Page auto-reloads with new content

### API Endpoints
- `POST /api/cms/save` - Saves page data to local JSON file
- `GET /api/cms/load?page=[name]` - Loads page data from local JSON file

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
2. Creates/uses draft branch `cms-draft-[username]`
3. Commits to draft branch via GitHub API
4. User clicks "Publish" when ready
5. Merges draft branch to main
6. GitHub Actions rebuilds and deploys site

### Branch Naming
- Main branch: `main` (or default branch)
- Draft branches: `cms-draft-[github-username]`

## Configuration

### Environment Detection

The mode is automatically detected based on:
```typescript
export const isDevelopmentMode = (): boolean => {
  return import.meta.env.DEV || import.meta.env.MODE === 'development';
};
```

### No Configuration Needed!
The system automatically switches based on:
- `npm run dev` → Development Mode
- `npm run build` → Production Mode
- Deployed site → Production Mode

## Storage Adapter API

The unified storage adapter provides a consistent interface:

### `savePage(pageName, data)`
Saves page data to appropriate backend:
- Dev: Writes to local file
- Prod: Commits to draft branch

```typescript
import { savePage } from '@/lib/cms-storage-adapter';

await savePage('index', {
  components: [/* ... */]
});
```

### `loadDraft(pageName)`
Loads unpublished changes:
- Dev: Loads from local file
- Prod: Loads from draft branch

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
- Dev: No-op (logs message)
- Prod: Merges draft branch to main

```typescript
import { publish } from '@/lib/cms-storage-adapter';

await publish(); // Only does something in production
```

## UI Differences

### Development Mode
- No "Publish" button needed
- Alert shows: "Development Mode - Changes are saved locally and applied immediately"
- Save button writes directly to files
- Instant hot reload

### Production Mode
- "Publish" button appears when changes exist
- Alert shows: "Draft Changes - Click publish to make them live"
- Save button writes to draft branch
- Publish button merges to main

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
│   └── src/content/pages/*.json    ← Published content
└── cms-draft-[user] branch
    └── src/content/pages/*.json    ← Draft content
```

## API Security

The local storage API endpoints are protected:

```typescript
if (import.meta.env.PROD) {
  return new Response(
    JSON.stringify({ error: 'Only available in development' }),
    { status: 403 }
  );
}
```

This prevents the endpoints from being exploited in production.

## Troubleshooting

### Dev Mode: Changes Not Appearing
1. Check console for save errors
2. Verify `/src/content/pages/[page].json` exists
3. Check file permissions
4. Restart dev server

### Production Mode: Can't Save
1. Verify GitHub token is valid
2. Check repo permissions
3. Verify branch protection rules allow CMS bot
4. Check network connectivity

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
| Storage | Local file system | GitHub API |
| Authentication | None | GitHub OAuth |
| Branches | None | Draft branches |
| Publish | Instant | Manual publish |
| Hot Reload | Yes | No |
| Offline | Yes | No |
| Multi-User | Single developer | Multiple editors |
| Review Workflow | Via Git | Via draft branches |

This dual-mode system provides the best of both worlds: fast iteration during development and a robust review workflow in production.
