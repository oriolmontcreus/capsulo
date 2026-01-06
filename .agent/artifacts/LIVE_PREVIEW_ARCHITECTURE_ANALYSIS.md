# Live Preview Architecture Analysis

**Date:** 2026-01-06  
**Context:** Investigating the best approach for live preview in development mode

---

## Problem Statement

Currently, when editing content in the CMS admin panel:

- Drafts are saved to **IndexedDB** (client-side)
- The website renders from **local JSON files** (server-side, via `cms-loader.ts`)
- Local files only update when you explicitly **"Save/Commit"**

**Result:** Users don't see live preview of their changes on the actual website while editing.

---

## Approach 1: Sync IndexedDB → Local Files on Every Draft (❌ Rejected)

### How it would work

```
User types → Debounce (500ms) → Save to IndexedDB → Also write to JSON file → HMR triggers page refresh
```

### Problems

1. **File System Spam**: Even with debouncing, every field edit triggers a file write. A typical editing session could produce 100+ writes.
2. **Disk I/O**: Frequent writes cause unnecessary disk activity, especially problematic on SSDs (wear) and slower drives.
3. **Git Noise**: If auto-watching git status, you'd see constant file changes.
4. **Race Conditions**: Rapid edits could cause file write conflicts.
5. **HMR Churn**: Every write triggers Astro's HMR, causing constant page reloads.

### Verdict: **Not recommended** — too resource-intensive for local development

---

## Approach 2: Remove Local Files from Dev Mode (✅ Recommended)

### Concept

In development mode, the website should read content **directly from IndexedDB** (client-side), not from JSON files.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION (Build Time)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  Static Build reads from:                                                    │
│  • Local JSON files (src/content/pages/*.json)                              │
│  • Which are populated from the main branch via GitHub                       │
│                                                                              │
│  Result: Static HTML with baked-in content                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEVELOPMENT (Live Preview)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  OPTION A: Client-Side Hydration                                             │
│  ──────────────────────────────────────────────────────────────────────────  │
│  1. Server renders with initial data from JSON files (for first paint)      │
│  2. Client hydrates and reads from IndexedDB for draft overrides             │
│  3. Draft data "overwrites" server-rendered content on the client            │
│                                                                              │
│  OPTION B: Separate Preview Route                                            │
│  ──────────────────────────────────────────────────────────────────────────  │
│  1. Website routes (/, /about, etc.) work as normal from JSON files          │
│  2. New "/_preview/*" routes render 100% client-side from IndexedDB          │
│  3. Admin panel shows the /_preview route in an iframe for live preview      │
│                                                                              │
│  OPTION C: Embedded Preview (Simplest)                                       │
│  ──────────────────────────────────────────────────────────────────────────  │
│  1. Admin panel directly renders a preview component using React             │
│  2. Preview component reads from IndexedDB and renders the component         │
│  3. No actual page navigation needed — preview is inside the admin           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Analysis of Options

### Option A: Client-Side Hydration (Moderate Complexity)

#### How it works

1. Website renders normally from JSON files (SSR)
2. Add a small client script that:
   - Checks if we're in dev mode
   - Reads drafts from IndexedDB
   - Replaces rendered content with draft content
   - Subscribes to IndexedDB changes for live updates

#### Pros

- Works on actual website routes
- SSR still works for initial load
- True WYSIWYG preview

#### Cons

- Requires client-side JavaScript on every page in dev mode
- Content "flashes" when hydrating with draft data
- Need to build a client-side renderer for each component

#### Implementation effort: **Medium**

---

### Option B: Separate Preview Route (Medium Complexity)

#### How it works

1. Create `/_preview/[...path].astro` that renders entirely client-side
2. This route reads from IndexedDB and renders components
3. Admin panel shows this route in an iframe or popup

#### Pros

- Clean separation between dev preview and production rendering
- No impact on production build
- Can show preview in admin panel

#### Cons

- Need to duplicate component rendering logic (client-side)
- URL mismatch between preview and production
- Styles might differ

#### Implementation effort: **Medium-High**

---

### Option C: Embedded Preview (Simplest)

#### How it works

1. Admin panel already has access to IndexedDB data
2. Add a "Preview" tab/panel that renders the components inline
3. Use React to render a simplified preview of the content

#### Pros

- Simplest to implement
- No changes to website rendering
- Instant updates (same React context as form)

#### Cons

- Preview might not match production exactly
- Limited to component-level preview, not full page
- Styles might differ from actual website

#### Implementation effort: **Low**

---

## Recommendation

### Short-Term: Option C (Embedded Preview)

- Add a Preview panel in the admin that shows a live preview of the component being edited
- This requires minimal changes and provides immediate value
- Can be implemented in a few hours

### Medium-Term: Option A (Client-Side Hydration)

- Add a dev-mode client script that hydrates pages with IndexedDB drafts
- This provides true WYSIWYG preview on the actual website
- Requires building a client-side "draft overlay" system

---

## Data Flow Comparison

### Current Flow (No Live Preview)

```
Admin Edit → IndexedDB → (nothing happens on website)
                   ↓
           "Save" Button → API → JSON File → Website sees change
```

### Proposed Flow (Option A)

```
Admin Edit → IndexedDB ←──┐
                   ↓      │
           Website (dev) reads from IndexedDB on client
                   ↑      │
           Client script syncs changes in real-time
```

### Proposed Flow (Option C)

```
Admin Edit → IndexedDB → Preview Panel (inside admin)
                   │
                   ↓
           "Save" Button → API → JSON File → Website sees change
                                              (for production builds)
```

---

## Technical Considerations

### IndexedDB is Client-Side Only

**Challenge:** The website uses SSR (Server-Side Rendering), but IndexedDB only exists in the browser.

**Solutions:**

1. **Client-side reading**: Use React/Vue hydration to read from IndexedDB after initial SSR
2. **API bridge**: Create an API that serves IndexedDB data (but IndexedDB isn't on server...)
3. **In-memory store**: Use a shared in-memory store via WebSocket between admin and website tabs

### JSON Files Still Needed for Production

- Production builds (static export) need JSON files
- The build process reads from `src/content/pages/*.json`
- These files should be the "committed" version from the main branch

### When Do JSON Files Update?

Under this new model:

- **Never during local editing** — drafts stay in IndexedDB
- **On "Save/Commit"** — writes to JSON files + GitHub draft branch
- **On "Publish"** — merges draft branch to main, JSON files get updated versions

---

## Summary

| Aspect | File Sync Approach | IndexedDB Preview Approach |
|--------|-------------------|---------------------------|
| File writes | Constant (every edit) | Only on explicit save |
| Disk usage | High | Minimal |
| Live preview | Via HMR (laggy) | Instant (client-side) |
| Complexity | Low (but wasteful) | Medium |
| Production impact | None | None |

**Recommendation:** Go with **Option C (Embedded Preview)** for quick wins, then consider **Option A (Client-Side Hydration)** for true WYSIWYG preview.

---

## Next Steps

1. [ ] Decide which approach to implement
2. [ ] Create implementation plan
3. [ ] Build MVP of chosen approach
4. [ ] Test and iterate

---

*This analysis was created to inform the architecture decision for CMS live preview functionality.*
