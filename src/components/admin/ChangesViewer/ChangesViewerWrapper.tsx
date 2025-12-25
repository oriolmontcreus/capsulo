import React, { useState, useEffect } from 'react';
import { ChangesSidebar } from './ChangesSidebar';
import { DiffView } from './DiffView';
import type { PageInfo } from '@/components/admin/AppWrapper';
import type { PageData, ComponentData } from '@/lib/form-builder';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ChangesViewerWrapperProps {
    availablePages: PageInfo[];
}

export default function ChangesViewerWrapper({ availablePages }: ChangesViewerWrapperProps) {
    const [selectedPage, setSelectedPage] = useState<string>(availablePages[0]?.id || '');
    const [commitMessage, setCommitMessage] = useState('');
    const [oldPageData, setOldPageData] = useState<PageData | null>(null);
    const [newPageData, setNewPageData] = useState<PageData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [noDraftBranch, setNoDraftBranch] = useState(false);

    // Load page data from both main (old) and draft (new) branches
    useEffect(() => {
        if (!selectedPage) return;

        const loadData = async () => {
            setLoading(true);
            setError(null);
            setNoDraftBranch(false);

            try {
                const fileName = selectedPage === "home" ? "index" : selectedPage;

                // Get GitHub token from localStorage
                const token = localStorage.getItem('github_access_token');
                if (!token) {
                    setError('Not logged in. Please log in to view changes.');
                    setOldPageData(null);
                    setNewPageData(null);
                    setLoading(false);
                    return;
                }

                // Fetch both branches in parallel
                const [mainResponse, draftResponse] = await Promise.all([
                    fetch(`/api/cms/changes?page=${encodeURIComponent(fileName)}&branch=main&token=${encodeURIComponent(token)}`),
                    fetch(`/api/cms/changes?page=${encodeURIComponent(fileName)}&branch=draft&token=${encodeURIComponent(token)}`)
                ]);

                // Handle main branch (old data)
                if (mainResponse.ok) {
                    const mainResult = await mainResponse.json();
                    setOldPageData(mainResult.data || { components: [] });
                } else if (mainResponse.status === 401) {
                    // Token issue
                    const errorData = await mainResponse.json();
                    setError(errorData.hint || 'Please log in to view changes');
                    setOldPageData(null);
                    setNewPageData(null);
                    return;
                } else {
                    setOldPageData({ components: [] });
                }

                // Handle draft branch (new data)
                if (draftResponse.ok) {
                    const draftResult = await draftResponse.json();
                    if (draftResult.data === null && draftResult.message?.includes('does not exist')) {
                        // Draft branch doesn't exist yet
                        setNoDraftBranch(true);
                        setNewPageData(null);
                    } else {
                        setNewPageData(draftResult.data || { components: [] });
                    }
                } else {
                    setNewPageData({ components: [] });
                }

            } catch (err) {
                console.error("Failed to load changes data", err);
                setError('Failed to load changes data.');
                setOldPageData(null);
                setNewPageData(null);
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

    const handleRefresh = () => {
        // Trigger a re-fetch by updating the selected page
        const current = selectedPage;
        setSelectedPage('');
        setTimeout(() => setSelectedPage(current), 0);
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
                    <header className="h-14 border-b flex items-center justify-between px-6">
                        <div>
                            <span className="font-semibold">Changes:</span>
                            <span className="text-muted-foreground ml-2 font-normal capitalize">{selectedPage}</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={loading}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </header>

                    <div className="flex-1 overflow-auto bg-muted/10">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                                Loading changes from GitHub...
                            </div>
                        ) : error ? (
                            <div className="p-8">
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Unable to load changes</AlertTitle>
                                    <AlertDescription>
                                        {error}
                                    </AlertDescription>
                                </Alert>
                            </div>
                        ) : noDraftBranch ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
                                <AlertCircle className="h-12 w-12 opacity-50" />
                                <div className="text-center">
                                    <p className="font-medium">No draft changes yet</p>
                                    <p className="text-sm mt-1">
                                        Make changes in the CMS editor and save to create a draft branch.
                                    </p>
                                </div>
                            </div>
                        ) : oldPageData && newPageData ? (
                            <DiffView
                                oldPageData={oldPageData}
                                newPageData={newPageData}
                            />
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

