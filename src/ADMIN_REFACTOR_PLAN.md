# Admin Panel Refactoring Report & Implementation Plan

## 1. Executive Summary
The current admin panel implementation suffers from significant scalability and performance issues due to a "Monolithic React Island" architecture. Data for the entire application is pre-loaded on the server, and the entire application state is managed within a single "God Component" (`AppWrapper`), leading to excessive re-renders and poor maintainability.

We recommend a shift to a modern, **Client-Side SPA (Single Page Application)** architecture hosted within a single Astro route. This will utilize **React Router (v7)** for navigation and **TanStack Query** for efficient data management.

## 2. Current State Analysis

### 2.1 Entry Point (`src/pages/admin/index.astro`)
- **Bottleneck**: This file scans the entire `content/pages` directory and pre-loads metadata and initial data for *every page* each time the admin panel is accessed.
- **Scaling Risk**: As the number of pages grows to hundreds or thousands, the initial load time will degrade linearly.
- **Hybrid Confusion**: It attempts to mix Static Site Generation (passing initial data) with Client-Side rendering, creating a disjointed data flow.

### 2.2 The "God Component" (`AppWrapper.tsx`)
- **State Management**: Holds `pagesData`, `globalData`, `activeView`, `auth`, `search`, and `commits` in a single component state. Any update to any of these triggers a re-render of the entire tree.
- **Routing**: Implements a manual, fragile "pseudo-router" using `window.history.pushState` and `window.addEventListener('popstate')`. This reinvents the wheel and lacks features like nested routing, loaders, or error boundaries.
- **Context Hell**: Wraps the application in 8+ layers of Context Providers (`PerformanceMonitor`, `Preferences`, `Auth`, `Translation`, `Validation`, etc.), making the component tree deep and complex to debug.
- **Mixed Concerns**: Handles UI layout, data fetching, routing logic, and business logic all in one file (570+ lines).

## 3. Recommended Architecture

### 3.1 Core Strategy: "Pure SPA" inside Astro
Instead of treating the Admin as a set of Astro components, we should treat it as a **standalone React Application** that Astro simply serves.

- **URL Structure**:
  - `/admin/*` -> Handled by `src/pages/admin/[...all].astro`.
  - This single Astro page renders one React root: `<AdminApp />`.

### 3.2 Tech Stack Upgrades
1.  **Routing**: **React Router v7** (or `react-router-dom` v6).
    - why: Standard, robust, handles nested layouts, browser history, and parsing params automatically.
2.  **Data Fetching**: **TanStack Query (React Query)**.
    - why: Replaces the manual `pagesDataCache` and `loadingPages` state. Handles caching, background refetching, and deduping automatically.
3.  **Global Store**: **Zustand**.
    - why: For client-only global state (like "isSidebarOpen", "currentTheme"). It avoids the Context Provider wrapper hell.

## 4. Implementation Plan

### Phase 1: Preparation DONE
1.  **Install Dependencies**:
    ```bash
    npm install react-router-dom @tanstack/react-query zustand
    ```
2.  **Create API Types**: Ensure shared types for API responses are available to the client.

### Phase 2: Router & Layout Setup DONE
1.  **Create `src/components/admin/router/AdminRouter.tsx`**:
    - Define routes:
      - `/admin/` -> Redirect to `/admin/content`
      - `/admin/content` -> Page List
      - `/admin/content/:pageId` -> Page Editor
      - `/admin/globals` -> Global Variables Editor
      - `/admin/history` -> Commit History
2.  **Create `src/components/admin/layouts/AdminLayout.tsx`**:
    - Holds the `Sidebar`, `Header`, and an `<Outlet />` for the active route.
    - Removes layout logic from `AppWrapper`.

### Phase 3: Data Layer Refactor (Crucial) DONE
1.  **Create Custom Hooks (`src/lib/api/hooks.ts`)**:
    - `usePages()`: Fetches list of pages.
    - `usePageData(pageId)`: Fetches data for a specific page using React Query.
    - `useGlobalData()`: Fetches global variables.
2.  **Remove Caching Logic**: Delete `pagesDataCache`, `loadingData`, and `loadPageData` from the main component. Let React Query handle it.

### Phase 4: Component Migration DONE
1.  **Refactor `AppWrapper`**:
    - Rename to `AdminRoot`.
    - It should only contain the Context Providers (Validation, Preferences) that are truly global, then render `<AdminRouter />`.
    - It should not have props / context drilling.
2.  **Update `CMSManager` and `GlobalVariablesManager`**:
    - Instead of receiving `initialData` props, they should use the `usePageData` hook to get their data.

### Phase 5: Cleanup DONE
1.  **Simplify `index.astro`**:
    - Remove the file globbing and data pre-loading.
    - Just render `<AdminRoot client:only="react" />`.
    - This creates a specialized "Application Shell" that loads instantly and fetches data asynchronously.

### Phase 6: Storage Refactor DONE
1.  **SessionStorage for Drafts**:
    - Migrated `cms-local-changes.ts` from `localStorage` to `sessionStorage`.
    - Draft changes are now lost when the browser session ends (intended behavior).
    - Users must commit their changes or lose them when closing the browser.
2.  **Smart GitHub Caching**:
    - Created `cms-cache.ts` for localStorage-based page caching.
    - Added `/api/cms/commit-sha` endpoint for lightweight commit SHA checks.
    - Updated `api/client.ts` to check cache validity before fetching.
    - Cache invalidates when commit SHA changes (data was updated remotely).
    - TanStack Query hooks now integrate with the cache for fast initial loads.

## 5. Benefits
- **Performance**: Initial load is fast (HTML shell only). Data loads in parallel on mounting.
- **Maintainability**: Clear separation of concerns (Routing handling URLs, Query handling Data, Layout handling UI).
- **Scalability**: Can handle thousands of pages without bloating the initial bundle or server response time.
- **DX (Developer Experience)**: Easier to debug, standard patterns, no "prop drilling" 10 layers deep.
- **User Intent Clarity**: SessionStorage drafts ensure users understand changes must be committed.
- **Reduced API Load**: Smart caching minimizes GitHub API calls by using localStorage with commit-based invalidation.

