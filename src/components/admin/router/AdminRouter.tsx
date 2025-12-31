import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';

// Placeholder components for routes
const ContentList = () => <div className="p-8"><h1>Content Pages</h1><p>List of pages will go here.</p></div>;
const PageEditor = () => <div className="p-8"><h1>Page Editor</h1><p>Editor interface will go here.</p></div>;
const GlobalVariables = () => <div className="p-8"><h1>Global Variables</h1><p>Global variables editor will go here.</p></div>;
const HistoryViewer = () => <div className="p-8"><h1>History</h1><p>Commit history will go here.</p></div>;

interface AdminRouterProps {
    basename?: string;
}

/**
 * Main Router for the Admin SPA.
 * Handles all client-side routing.
 */
export default function AdminRouter({ basename = "/admin" }: AdminRouterProps) {
    return (
        <BrowserRouter basename={basename}>
            <Routes>
                <Route element={<AdminLayout />}>
                    {/* Default redirect to content */}
                    <Route path="/" element={<Navigate to="content" replace />} />

                    {/* Main sections */}
                    <Route path="content" element={<ContentList />} />
                    <Route path="content/:pageId" element={<PageEditor />} />
                    <Route path="globals" element={<GlobalVariables />} />
                    <Route path="history" element={<HistoryViewer />} />

                    {/* Catch all - 404 */}
                    <Route path="*" element={<div className="p-8">Page not found</div>} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
