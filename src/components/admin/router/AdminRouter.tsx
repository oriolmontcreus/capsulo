import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import {
    ContentListPage,
    PageEditorPage,
    GlobalsPage,
    HistoryPage,
    ChangesPage,
} from '../pages';

// 404 Not Found page
const NotFoundPage = () => (
    <div className="p-8">
        <h1 className="text-2xl font-bold text-destructive mb-2">Page Not Found</h1>
        <p className="text-muted-foreground">The requested admin page does not exist.</p>
    </div>
);

interface AdminRouterProps {
    basename?: string;
}

/**
 * Main Router for the Admin SPA.
 * Handles all client-side routing.
 * 
 * Route structure:
 * - /admin/          → Redirect to /admin/content
 * - /admin/content   → Page list (ContentListPage)
 * - /admin/content/:pageId → Page editor (PageEditorPage)
 * - /admin/globals   → Global variables editor (GlobalsPage)
 * - /admin/changes   → Uncommitted changes view (ChangesPage)
 * - /admin/history   → Commit history (HistoryPage)
 */
export default function AdminRouter({ basename = "/admin" }: AdminRouterProps) {
    return (
        <BrowserRouter basename={basename}>
            <Routes>
                <Route element={<AdminLayout />}>
                    {/* Default redirect to content */}
                    <Route path="/" element={<Navigate to="content" replace />} />

                    {/* Content section */}
                    <Route path="content" element={<ContentListPage />} />
                    <Route path="content/:pageId" element={<PageEditorPage />} />

                    {/* Global variables */}
                    <Route path="globals" element={<GlobalsPage />} />

                    {/* Changes view */}
                    <Route path="changes" element={<ChangesPage />} />

                    {/* History */}
                    <Route path="history" element={<HistoryPage />} />

                    {/* Catch all - 404 */}
                    <Route path="*" element={<NotFoundPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
