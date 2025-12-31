import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FileText, Globe, GitCommit, History } from 'lucide-react';

// Create a stable QueryClient instance
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes default
            retry: 1,
        },
    },
});

interface NavItemProps {
    to: string;
    icon: React.ReactNode;
    label: string;
}

const NavItem = ({ to, icon, label }: NavItemProps) => (
    <NavLink
        to={to}
        className={({ isActive }: { isActive: boolean }) =>
            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`
        }
    >
        {icon}
        {label}
    </NavLink>
);

/**
 * Main layout for the Admin SPA.
 * Houses the Sidebar, Header, and content area.
 * Provides QueryClientProvider for TanStack Query data fetching.
 */
export default function AdminLayout() {
    return (
        <QueryClientProvider client={queryClient}>
            <div className="flex h-screen w-full bg-background text-foreground">
                {/* Sidebar */}
                <aside className="w-64 border-r bg-muted/10 flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b">
                        <h1 className="text-xl font-bold">Admin Panel</h1>
                        <p className="text-xs text-muted-foreground mt-1">SPA Test Environment</p>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1">
                        <NavItem to="content" icon={<FileText className="h-4 w-4" />} label="Content" />
                        <NavItem to="globals" icon={<Globe className="h-4 w-4" />} label="Global Variables" />
                        <NavItem to="changes" icon={<GitCommit className="h-4 w-4" />} label="Changes" />
                        <NavItem to="history" icon={<History className="h-4 w-4" />} label="History" />
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t text-xs text-muted-foreground">
                        Phase 4: Component Migration
                    </div>
                </aside>

                {/* Main content area */}
                <main className="flex-1 overflow-auto relative flex flex-col">
                    {/* The Outlet renders the child route's element */}
                    <Outlet />
                </main>
            </div>
        </QueryClientProvider>
    );
}
