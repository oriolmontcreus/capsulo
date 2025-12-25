import React, { useState, useEffect } from 'react';
import { ChangesSidebar } from './ChangesSidebar';
import { DiffView } from './DiffView';
import type { PageInfo } from '@/components/admin/AppWrapper';
import type { PageData, ComponentData } from '@/lib/form-builder';
import { SidebarProvider } from '@/components/ui/sidebar';

interface ChangesViewerWrapperProps {
    availablePages: PageInfo[];
}

export default function ChangesViewerWrapper({ availablePages }: ChangesViewerWrapperProps) {
    const [selectedPage, setSelectedPage] = useState<string>(availablePages[0]?.id || '');
    const [commitMessage, setCommitMessage] = useState('');
    const [pageData, setPageData] = useState<PageData | null>(null);
    const [loading, setLoading] = useState(false);

    // Load page data
    useEffect(() => {
        if (!selectedPage) return;

        const loadData = async () => {
            setLoading(true);
            try {
                const fileName = selectedPage === "home" ? "index" : selectedPage;
                const response = await fetch(`/api/cms/load?page=${encodeURIComponent(fileName)}`);
                if (response.ok) {
                    const data: PageData = await response.json();
                    setPageData(data);
                } else {
                    setPageData({ components: [] });
                }
            } catch (error) {
                console.error("Failed to load page data", error);
                setPageData({ components: [] });
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [selectedPage]);

    const handlePublish = () => {
        console.log('Publishing changes for page:', selectedPage);
        console.log('Commit message:', commitMessage);
        // Future: Call API to publish
    };

    return (
        <SidebarProvider>
            <div className="flex w-full h-screen bg-background overflow-hidden">
                {/* Sidebar */}
                <ChangesSidebar
                    availablePages={availablePages}
                    selectedPage={selectedPage}
                    onPageSelect={setSelectedPage}
                    commitMessage={commitMessage}
                    onCommitMessageChange={setCommitMessage}
                    onPublish={handlePublish}
                />

                {/* Main Content - Diff View */}
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <header className="h-14 border-b flex items-center px-6 font-semibold">
                        {selectedPage} <span className="text-muted-foreground ml-2 font-normal">Changes</span>
                    </header>

                    <div className="flex-1 overflow-auto bg-muted/10">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Loading...
                            </div>
                        ) : pageData ? (
                            <DiffView pageData={pageData} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Select a page to view changes
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </SidebarProvider>
    );
}
