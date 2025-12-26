import React, { useState, useEffect } from 'react';
import { DiffView } from './DiffView';
import { useAuthContext } from '../AuthProvider';
import type { PageData } from '@/lib/form-builder';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ChangesManagerProps {
    pageId: string;
    pageName: string;
    localData: PageData;
}

export const ChangesManager: React.FC<ChangesManagerProps> = ({ pageId, pageName, localData }) => {
    const { token } = useAuthContext();
    const [remoteData, setRemoteData] = useState<PageData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!pageId || !token) return;

        const fetchRemoteData = async () => {
            setLoading(true);
            setError(null);
            try {
                const fileName = pageId === "home" ? "index" : pageId;
                const response = await fetch(`/api/cms/changes?page=${encodeURIComponent(fileName)}&branch=main`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch remote data');
                }

                const result = await response.json();
                const fetchedData = result.data || { components: [] };

                // Map GlobalData to PageData if needed
                if ('variables' in fetchedData) {
                    setRemoteData({ components: fetchedData.variables });
                } else {
                    setRemoteData(fetchedData);
                }
            } catch (err: any) {
                console.error('Error fetching remote data:', err);
                setError(err.message || 'Failed to load remote data from GitHub.');
                setRemoteData({ components: [] });
            } finally {
                setLoading(false);
            }
        };

        fetchRemoteData();
    }, [pageId, token]);

    return (
        <div className="flex-1 overflow-auto">
            <header className="px-8 py-6 border-b flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tight">Changes: {pageName}</h1>
                {loading && (
                    <div className="flex items-center text-sm text-muted-foreground">
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Fetching remote data...
                    </div>
                )}
            </header>

            {error && (
                <div className="p-8">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </div>
            )}

            {(!loading || remoteData) && (
                <DiffView
                    oldPageData={remoteData || { components: [] }}
                    newPageData={localData}
                />
            )}

            {loading && !remoteData && !error && (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <RefreshCw className="h-8 w-8 mb-4 animate-spin opacity-20" />
                    <p>Loading comparison data from GitHub...</p>
                </div>
            )}
        </div>
    );
};
