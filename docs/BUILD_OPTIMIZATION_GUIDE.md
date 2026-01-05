# Build Optimization Guide for Capsulo

> **Current Build Time**: ~15.32 seconds  
> **Potential Target**: ~5-8 seconds (with all optimizations)

This document outlines all possible optimizations to improve build times for the Capsulo project.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Build Analysis](#current-build-analysis)
3. [Quick Wins (Immediate Impact)](#quick-wins-immediate-impact)
4. [Vite/Rollup Optimizations](#viterollup-optimizations)
5. [Turborepo Integration](#turborepo-integration)
6. [Code Splitting Strategies](#code-splitting-strategies)
7. [Caching Strategies](#caching-strategies)
8. [TypeScript Optimizations](#typescript-optimizations)
9. [Dependency Optimizations](#dependency-optimizations)
10. [CI/CD Build Optimizations](#cicd-build-optimizations)
11. [Implementation Priority Matrix](#implementation-priority-matrix)

---

## Executive Summary

Based on the build output analysis, here are the **top 5 immediate actions**:

| Priority | Optimization | Expected Improvement |
|----------|-------------|---------------------|
| 🔴 Critical | Code splitting the AdminRoot bundle (1.69 MB) | 30-40% faster client build |
| 🟠 High | Add manual chunks configuration | 20-30% faster builds |
| 🟠 High | Enable Vite's build caching | 50-70% faster incremental builds |
| 🟡 Medium | Implement Turborepo for monorepo caching | 80-90% cache hit builds |
| 🟡 Medium | Optimize component scanner plugin | 5-10% faster builds |

---

## Current Build Analysis

### Build Time Breakdown

```
Phase                          Time      % of Total
─────────────────────────────────────────────────────
prebuild.js script             ~0.5s     3%
Content syncing & types        ~0.62s    4%
Build info collection          ~0.66s    4%
Static entrypoints (Vite)      ~2.65s    17%
Client build (Vite)            ~9.76s    64%  ← BOTTLENECK
Static route generation        ~2.20s    14%
postbuild.js script            ~0.1s     <1%
─────────────────────────────────────────────────────
Total                          ~15.32s   100%
```

### Identified Issues

1. **Massive Client Bundle**: `AdminRoot.CxUM7Fjx.js` is **1,688 KB** (512 KB gzipped)
2. **Large Editor Bundle**: `configurable-editor.BU_enBvV.js` is **352 KB**
3. **4,580 modules transformed** - indicates potential over-bundling
4. **Component scanner runs 3 times** during build (could be cached)
5. **No build caching** configured for Vite or TypeScript

---

## Quick Wins (Immediate Impact)

### 1. Enable Vite Build Cache

Add persistent caching to dramatically speed up incremental builds:

```javascript
// astro.config.mjs
export default defineConfig({
  vite: {
    cacheDir: 'node_modules/.vite',
    build: {
      // Enable persistent cache for dependencies
      commonjsOptions: {
        include: [/node_modules/],
      },
    },
    optimizeDeps: {
      // Force include heavy dependencies for pre-bundling
      include: [
        'react',
        'react-dom',
        'lexical',
        '@lexical/react',
        '@lexical/rich-text',
        '@lexical/list',
        '@lexical/code',
        '@lexical/link',
        'react-router-dom',
        '@tanstack/react-query',
        'zustand',
        'lodash',
        'date-fns',
      ],
    },
  },
});
```

**Expected Improvement**: 50-70% faster for incremental builds

### 2. Add Manual Chunks Configuration

Split the massive bundles into logical chunks:

```javascript
// astro.config.mjs
export default defineConfig({
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Core React ecosystem
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            
            // State management
            'vendor-state': ['zustand', '@tanstack/react-query'],
            
            // Lexical editor (largest dependency)
            'vendor-lexical': [
              'lexical',
              '@lexical/react',
              '@lexical/rich-text',
              '@lexical/code',
              '@lexical/list',
              '@lexical/link',
              '@lexical/markdown',
              '@lexical/table',
              '@lexical/selection',
              '@lexical/utils',
              '@lexical/hashtag',
              '@lexical/overflow',
              '@lexical/file',
              '@lexical/text',
            ],
            
            // CodeMirror
            'vendor-codemirror': [
              '@codemirror/autocomplete',
              '@codemirror/commands',
              '@codemirror/lang-xml',
              '@codemirror/language',
              '@codemirror/search',
              '@codemirror/state',
              '@codemirror/view',
              '@codemirror/theme-one-dark',
              '@uiw/codemirror-theme-vscode',
            ],
            
            // UI components (Radix)
            'vendor-ui': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-popover',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-alert-dialog',
              '@radix-ui/react-checkbox',
              '@radix-ui/react-switch',
              '@radix-ui/react-slider',
              '@radix-ui/react-separator',
              '@radix-ui/react-scroll-area',
              '@radix-ui/react-avatar',
              '@radix-ui/react-collapsible',
              '@radix-ui/react-context-menu',
              '@radix-ui/react-label',
              '@radix-ui/react-slot',
              '@radix-ui/react-toggle',
              '@radix-ui/react-toggle-group',
            ],
            
            // Utilities
            'vendor-utils': ['lodash', 'date-fns', 'clsx', 'zod', 'diff'],
          },
        },
      },
    },
  },
});
```

**Expected Improvement**: 20-30% faster builds, better caching

### 3. Suppress Chunk Size Warnings

If after optimization you still have large chunks (acceptable for admin panel):

```javascript
// astro.config.mjs
vite: {
  build: {
    chunkSizeWarningLimit: 1000, // 1MB instead of 500KB
  },
}
```

---

## Vite/Rollup Optimizations

### 4. Enable esbuild Minification (Already Default)

Vite uses esbuild by default, but ensure it's not overridden:

```javascript
// astro.config.mjs
vite: {
  build: {
    minify: 'esbuild', // Faster than terser
    target: 'esnext',  // Modern browsers only (fewer polyfills)
  },
}
```

### 5. Parallel Processing with Worker Threads

For large projects, enable worker threads:

```javascript
// astro.config.mjs
vite: {
  build: {
    rollupOptions: {
      // Use more threads for parsing
      maxParallelFileOps: 20,
    },
  },
  worker: {
    format: 'es',
  },
}
```

### 6. Optimize Component Scanner Plugin

The component scanner runs 3 times during build. Cache its results:

```typescript
// src/lib/vite-plugin-component-scanner.ts
// Add memoization
let cachedManifest: ComponentManifest | null = null;
let cacheKey: string | null = null;

function scanAllPagesManually(projectRoot: string): ComponentManifest {
  // Create a cache key based on file modification times
  const pagesDir = path.join(projectRoot, 'src/pages');
  const currentKey = getDirectoryHash(pagesDir);
  
  if (cachedManifest && cacheKey === currentKey) {
    console.log('[Component Scanner] 📦 Using cached manifest');
    return cachedManifest;
  }
  
  // ... existing scanning logic ...
  
  cachedManifest = manifest;
  cacheKey = currentKey;
  return manifest;
}
```

**Expected Improvement**: 5-10% faster builds

---

## Turborepo Integration

Turborepo provides **intelligent caching and parallel task execution** for monorepos.

### 7. Add Turborepo

```bash
npm install turbo --save-dev
```

### 8. Create turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [
    ".env",
    "astro.config.mjs",
    "capsulo.config.ts",
    "tsconfig.json"
  ],
  "globalEnv": [
    "PUBLIC_*",
    "GITHUB_*",
    "R2_*"
  ],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": [
        "src/**",
        "public/**",
        "scripts/**",
        "!src/**/*.test.ts",
        "!src/**/*.spec.ts"
      ],
      "outputs": [
        "dist/**",
        ".astro/**"
      ],
      "cache": true,
      "persistent": false
    },
    "dev": {
      "dependsOn": ["^build"],
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": [],
      "inputs": [
        "src/**/*.ts",
        "src/**/*.tsx",
        "vitest.config.ts"
      ],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "lint": {
      "dependsOn": [],
      "cache": true
    },
    "typecheck": {
      "dependsOn": [],
      "inputs": [
        "src/**/*.ts",
        "src/**/*.tsx",
        "tsconfig.json"
      ],
      "outputs": [],
      "cache": true
    }
  }
}
```

### 9. Update package.json Scripts

```json
{
  "scripts": {
    "build": "turbo run build",
    "build:no-cache": "turbo run build --force",
    "build:astro": "node scripts/prebuild.js && astro build && node scripts/postbuild.js",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "clean": "turbo clean && rm -rf dist .astro"
  }
}
```

### 10. Enable Remote Caching (Optional - for CI/CD)

```bash
# Login to Vercel for remote cache
npx turbo login

# Link your project
npx turbo link
```

**Expected Improvement**: 80-90% faster builds with cache hits

---

## Understanding Turborepo Cache: When It Hits vs Misses

This is **critical** for your use case. Here's exactly how Turborepo caching works:

### How Turborepo Determines Cache Validity

Turborepo creates a **hash** based on:
1. **Input files** (defined in `turbo.json` → `inputs`)
2. **Environment variables** (defined in `globalEnv`)
3. **Global dependencies** (defined in `globalDependencies`)
4. **Dependent task outputs** (from `dependsOn`)

If the hash is identical to a previous build, it restores the cached `outputs` instead of rebuilding.

### Your Specific Scenario

```
src/
├── content/           ← JSON data (changes frequently in prod)
│   ├── pages/
│   │   └── index.json
│   └── globals.json
├── components/        ← Code (rarely changes in prod)
├── pages/             ← Astro pages
└── lib/               ← Utilities
```

### ⚠️ The Problem: Content is in `src/`

With the default `turbo.json` I provided earlier:

```json
"inputs": ["src/**", "public/**", "scripts/**"]
```

**ANY change to `src/content/pages/index.json` WILL invalidate the cache** because `src/**` includes everything.

### ✅ The Solution: Exclude Content from Inputs

Update `turbo.json` to **exclude content files** from the build task inputs:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [
    ".env",
    "astro.config.mjs",
    "capsulo.config.ts",
    "tsconfig.json"
  ],
  "tasks": {
    "build": {
      "inputs": [
        "src/**",
        "public/**",
        "scripts/**",
        
        "!src/content/**",
        "!src/**/*.test.ts",
        "!src/**/*.spec.ts"
      ],
      "outputs": ["dist/**", ".astro/**"],
      "cache": true
    }
  }
}
```

The `!src/content/**` pattern **excludes** your JSON content from the cache key.

### Cache Hit/Miss Scenarios

| What Changed | Cache Result | Explanation |
|--------------|--------------|-------------|
| `src/content/pages/index.json` | ✅ **HIT** | Content excluded from inputs |
| `src/content/globals.json` | ✅ **HIT** | Content excluded from inputs |
| `public/images/logo.png` | ❌ **MISS** | Public assets are inputs |
| `src/components/Hero.tsx` | ❌ **MISS** | Component code changed |
| `src/pages/index.astro` | ❌ **MISS** | Page template changed |
| `astro.config.mjs` | ❌ **MISS** | Global dependency changed |
| `.env` | ❌ **MISS** | Global dependency changed |
| `package.json` (deps change) | ❌ **MISS** | Lock file changes trigger re-optimize |
| Nothing changed | ✅ **HIT** | Exact same hash |

### 🤔 Wait, But Won't Excluding Content Break the Build?

**No!** Here's why:

1. **Turborepo caches the BUILD PROCESS**, not the final output
2. Your content JSON files are read at **build time** by Astro
3. Even with a cache hit, Astro still reads the content files fresh

BUT there's a catch...

### ⚠️ Important: Astro Static Build Includes Content

For **static builds** (`output: 'static'`), Astro embeds your JSON content INTO the HTML/JS output at build time. This means:

- If content changes → the built HTML is stale
- Turbo would restore old cached `dist/` with old content

### The Real Solution for Content-Driven Sites

You have **two options**:

#### Option A: Accept Full Rebuilds for Content Changes

Keep content in inputs (my original config). Rebuilds are still fast (~6-8s with other optimizations).

```json
"inputs": ["src/**", "public/**", "scripts/**"]
```

**Pros**: Simple, always correct  
**Cons**: No cache benefit for content-only changes

#### Option B: Hybrid Build (Recommended for You)

Split your build into **two phases**:

```json
{
  "tasks": {
    "build:app": {
      "inputs": [
        "src/components/**",
        "src/pages/**",
        "src/lib/**",
        "src/layouts/**",
        "src/styles/**",
        "public/**",
        "!**/*.test.ts"
      ],
      "outputs": [".turbo/app-build/**"],
      "cache": true
    },
    "build:content": {
      "dependsOn": ["build:app"],
      "inputs": ["src/content/**"],
      "outputs": ["dist/**"],
      "cache": true
    },
    "build": {
      "dependsOn": ["build:content"],
      "cache": false
    }
  }
}
```

This caches the **expensive app compilation separately** from the **fast content rendering**.

**However**, Astro doesn't natively support this split. You'd need custom scripting.

#### Option C: Move to Hybrid Rendering (Best Long-Term)

Make **content pages use SSR** while admin stays static:

```javascript
// astro.config.mjs
export default defineConfig({
  output: 'hybrid',  // Changed from 'static'
});

// src/pages/index.astro
export const prerender = false;  // Render at request time
```

Then content is fetched **at runtime**, and Turborepo caches your entire `dist/` perfectly.

### Summary: What Works for You

Given your setup (Astro static, content in JSON):

| Strategy | Cache Hits | Complexity | Recommendation |
|----------|-----------|------------|----------------|
| Include content in inputs | Only on code changes | Simple | ✅ Start here |
| Exclude content | ⚠️ Stale builds | Simple | ❌ Don't do this |
| Hybrid build script | Both code & content | Medium | Consider later |
| Switch to `output: 'hybrid'` | Perfect | Medium | Best long-term |

### My Recommendation

**For now**, use this `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [
    ".env",
    "astro.config.mjs", 
    "capsulo.config.ts",
    "tsconfig.json",
    "package-lock.json"
  ],
  "tasks": {
    "build": {
      "inputs": [
        "src/**",
        "public/**",
        "scripts/**",
        "!src/**/*.test.ts"
      ],
      "outputs": ["dist/**", ".astro/**"],
      "cache": true
    }
  }
}
```

You'll get cache hits when:
- ✅ Running same build twice (testing)
- ✅ CI has cached a recent identical build
- ✅ Switching branches back to a previously built state
- ✅ Reverting changes

You'll get cache misses (rebuild) when:
- ❌ Any code changes
- ❌ Any content changes
- ❌ Dependency updates

**The real win is ~6-8s builds with other optimizations**, and Turbo's 2s cache when nothing changed.

---

## Code Splitting Strategies

### 11. Lazy Load Admin Components

The AdminRoot bundle is massive because it includes everything. Use React.lazy():

```tsx
// src/components/admin/AdminRoot.tsx
import React, { Suspense, lazy } from 'react';

// Lazy load heavy components
const CMSManager = lazy(() => import('./CMSManager'));
const GlobalVariablesManager = lazy(() => import('./GlobalVariablesManager'));
const ConfigurableEditor = lazy(() => import('./cms-manager/ConfigurableEditor'));
const HistoryViewer = lazy(() => import('./HistoryViewer/HistoryList'));
const ChangesViewer = lazy(() => import('./ChangesViewer/ChangesViewer'));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

export function AdminRoot() {
  return (
    <Suspense fallback={<PageLoader />}>
      {/* ... rest of your component */}
    </Suspense>
  );
}
```

### 12. Dynamic Imports for Routes

```tsx
// src/components/admin/router/AdminRouter.tsx
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const ContentListPage = lazy(() => import('../pages/ContentListPage'));
const PageEditorPage = lazy(() => import('../pages/PageEditorPage'));
const GlobalsPage = lazy(() => import('../pages/GlobalsPage'));
const HistoryPage = lazy(() => import('../pages/HistoryPage'));
const ChangesPage = lazy(() => import('../pages/ChangesPage'));

export function AdminRouter() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<ContentListPage />} />
        <Route path="/page/:pageId" element={<PageEditorPage />} />
        <Route path="/globals" element={<GlobalsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/changes" element={<ChangesPage />} />
      </Routes>
    </Suspense>
  );
}
```

**Expected Improvement**: 30-40% smaller initial bundle, faster page loads

---

## Caching Strategies

### 13. Persistent TypeScript Cache

```json
// tsconfig.json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./node_modules/.cache/tsbuildinfo"
  }
}
```

### 14. npm/pnpm Cache Optimization

Consider switching to pnpm for faster installs:

```bash
# Install pnpm
npm install -g pnpm

# Convert project
pnpm import

# Use pnpm going forward
pnpm install
pnpm run build
```

**pnpm benefits**:
- Faster installs (symlinked dependencies)
- Smaller node_modules
- Better monorepo support

---

## TypeScript Optimizations

### 15. Enable skipLibCheck

```json
// tsconfig.json
{
  "compilerOptions": {
    "skipLibCheck": true,
    "incremental": true
  }
}
```

### 16. Use Project References (for Workers)

```json
// tsconfig.json (root)
{
  "references": [
    { "path": "./workers/github-oauth" }
  ]
}
```

---

## Dependency Optimizations

### 17. Analyze Bundle Size

```bash
# Install bundle analyzer
npm install --save-dev rollup-plugin-visualizer

# Add to astro.config.mjs
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  vite: {
    plugins: [
      visualizer({
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
    ],
  },
});
```

### 18. Replace Heavy Dependencies

| Current | Alternative | Size Reduction |
|---------|-------------|----------------|
| `lodash` | `lodash-es` + tree-shaking | ~70% |
| `date-fns` | (already good) | - |
| `diff` | `fast-diff` | ~50% |

```javascript
// Instead of
import _ from 'lodash';

// Use
import debounce from 'lodash-es/debounce';
import throttle from 'lodash-es/throttle';
```

---

## CI/CD Build Optimizations

### 19. GitHub Actions Cache

```yaml
# .github/workflows/build.yml
name: Build
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Cache Turbo
        uses: actions/cache@v4
        with:
          path: .turbo
          key: ${{ runner.os }}-turbo-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-turbo-
      
      - name: Cache Vite
        uses: actions/cache@v4
        with:
          path: node_modules/.vite
          key: ${{ runner.os }}-vite-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-vite-
      
      - run: npm ci
      - run: npm run build
```

### 20. Parallel CI Jobs

```yaml
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx tsc --noEmit
  
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test
  
  build:
    needs: [typecheck, test]
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
```

---

## Implementation Priority Matrix

### Phase 1: Quick Wins (Day 1)
- [ ] Configure manual chunks in astro.config.mjs
- [ ] Enable Vite optimizeDeps.include
- [ ] Add skipLibCheck to tsconfig.json

### Phase 2: Code Splitting (Week 1)
- [ ] Implement React.lazy() for admin components
- [ ] Add dynamic imports for routes
- [ ] Split heavy components (CMSManager, Editor)

### Phase 3: Turborepo (Week 2)
- [ ] Install and configure Turborepo
- [ ] Create turbo.json
- [ ] Update package.json scripts
- [ ] Test cache functionality

### Phase 4: CI/CD (Week 3)
- [ ] Add GitHub Actions caching
- [ ] Configure remote Turbo cache
- [ ] Implement parallel CI jobs

### Phase 5: Advanced (Month 1)
- [ ] Analyze and replace heavy dependencies
- [ ] Consider pnpm migration
- [ ] Implement component scanner caching

---

## Quick Start Commands

```bash
# Analyze current bundle
npm run build -- --profile

# Clean build (no cache)
rm -rf node_modules/.vite .turbo dist .astro
npm run build

# With Turborepo (after setup)
npx turbo run build --force  # Ignore cache
npx turbo run build          # Use cache
npx turbo run build --dry    # Show what would run

# Check cache status
npx turbo run build --summarize
```

---

## Expected Results

| Optimization | Build Time | Improvement |
|-------------|------------|-------------|
| Current | 15.32s | Baseline |
| + Manual Chunks | ~12s | 22% faster |
| + Code Splitting | ~9s | 41% faster |
| + Vite Caching | ~6s (incremental) | 61% faster |
| + Turborepo | ~2s (cache hit) | 87% faster |

---

## References

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Vite Build Optimization](https://vitejs.dev/guide/build.html)
- [Astro Build Performance](https://docs.astro.build/en/guides/troubleshooting/#my-builds-are-slow)
- [Rollup Code Splitting](https://rollupjs.org/configuration-options/#output-manualchunks)
