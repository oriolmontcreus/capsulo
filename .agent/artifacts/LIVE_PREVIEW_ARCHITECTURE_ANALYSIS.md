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