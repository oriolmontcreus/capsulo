import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';

/**
 * Main layout for the Admin SPA.
 * This will eventually house the Sidebar, Header, and other persistent UI elements.
 */
export default function AdminLayout() {
    return (
        <div className="flex h-screen w-full bg-background text-foreground">
            {/* 
        Temporary Sidebar Placeholder 
        TODO: Migrate actual Sidebar components here 
      */}
            <aside className="w-64 border-r bg-muted/10 flex flex-col p-4">
                <h1 className="text-xl font-bold mb-6">Admin Panel</h1>
                <nav className="space-y-2 flex flex-col">
                    <NavLink
                        to="content"
                        className={({ isActive }: { isActive: boolean }) => `p-2 rounded hover:bg-muted ${isActive ? 'bg-muted font-bold' : ''}`}
                    >
                        Content
                    </NavLink>
                    <NavLink
                        to="globals"
                        className={({ isActive }: { isActive: boolean }) => `p-2 rounded hover:bg-muted ${isActive ? 'bg-muted font-bold' : ''}`}
                    >
                        Global Variables
                    </NavLink>
                    <NavLink
                        to="history"
                        className={({ isActive }: { isActive: boolean }) => `p-2 rounded hover:bg-muted ${isActive ? 'bg-muted font-bold' : ''}`}
                    >
                        History
                    </NavLink>
                </nav>
            </aside>

            <main className="flex-1 overflow-hidden relative flex flex-col">
                {/* The Outlet renders the child route's element */}
                <Outlet />
            </main>
        </div>
    );
}
