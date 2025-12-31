import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertCircle, FileText, GitCommit } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GitHubAPI } from '@/lib/github-api';
import { useAuthContext } from '../AuthProvider';
import { DiffView } from '../ChangesViewer/DiffView';
import { convertToPageData } from '../ChangesViewer/utils';
import type { PageData } from '@/lib/form-builder';
import type { RecoverFieldInfo } from '../ChangesViewer/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    updateFieldInPageDraft,
    updateFieldInGlobalsDraft
} from '@/lib/cms-local-changes';

interface CommitViewerProps {
    commitSha: string | null;
}

interface CommitDetails {
    sha: string;
    message: string;
    author: { name: string; login: string; avatarUrl: string };
    date: string;
    parentSha: string | null;
    files: Array<{ filename: string; status: string; additions: number; deletions: number; patch?: string }>;
}

interface FileChange {
    filename: string;
    pageName: string;
    status: string;
    oldData: PageData | null;
    newData: PageData | null;
}

// Format date for display
function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

// Extract page name from file path
function getPageNameFromPath(path: string): string {
    const match = path.match(/src\/content\/pages\/(.+)\.json$/);
    if (match) return match[1];
    if (path.includes('globals.json')) return 'Global Variables';
    return path.split('/').pop()?.replace('.json', '') || path;
}

// Check if file is a content file we can show diffs for
function isContentFile(filename: string): boolean {
    if (filename.startsWith('src/content/pages/') && filename.endsWith('.json')) return true;
    if (filename.includes('globals.json')) return true;
    return false;
}

// Extract page ID from file path for localStorage operations
function getPageIdFromPath(path: string): string {
    const match = path.match(/src\/content\/pages\/(.+)\.json$/);
    if (match) return match[1];
    if (path.includes('globals.json')) return 'globals';
    return path.split('/').pop()?.replace('.json', '') || path;
}

export function CommitViewer({ commitSha }: CommitViewerProps) {
    const { token } = useAuthContext();
    const [commitDetails, setCommitDetails] = useState<CommitDetails | null>(null);
    const [fileChanges, setFileChanges] = useState<FileChange[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedFilename, setSelectedFilename] = useState<string | null>(null);

    // Handler for recovering a field value from an old commit
    const handleRecoverField = useCallback(async (info: RecoverFieldInfo): Promise<boolean> => {
        const { componentId, fieldName, locale, valueToRecover, fieldType, pageName } = info;

        try {
            // Determine the pageId from the selected file
            const pageId = selectedFilename ? getPageIdFromPath(selectedFilename) : null;
            if (!pageId) return false;

            let success = false;

            if (pageId === 'globals') {
                // For globals, update the globals draft
                success = updateFieldInGlobalsDraft(componentId, fieldName, valueToRecover, locale, fieldType);
            } else {
                // For pages, update the page draft
                success = updateFieldInPageDraft(pageId, componentId, fieldName, valueToRecover, locale, fieldType);
            }

            if (success) {
                // Dispatch event to notify other components about the change
                window.dispatchEvent(new CustomEvent('cms-changes-updated'));
            }

            return success;
        } catch (err) {
            console.error('Error recovering field value:', err);
            return false;
        }
    }, [selectedFilename]);

    useEffect(() => {
        if (!commitSha || !token) {
            setCommitDetails(null);
            setFileChanges([]);
            setSelectedFilename(null);
            return;
        }

        const fetchCommitDetails = async () => {
            setLoading(true);
            setError(null);
            setSelectedFilename(null);

            try {
                const github = new GitHubAPI(token);
                const details = await github.getCommitDetails(commitSha);
                setCommitDetails(details);

                // Now fetch the actual file contents for content files
                setLoadingFiles(true);
                const contentFiles = details.files.filter(f => isContentFile(f.filename));

                const fileChangePromises = contentFiles.map(async (file) => {
                    const pageName = getPageNameFromPath(file.filename);

                    try {
                        const newRawData = file.status !== 'removed'
                            ? await github.getFileContentAtCommit(file.filename, commitSha)
                            : null;

                        const oldRawData = details.parentSha && file.status !== 'added'
                            ? await github.getFileContentAtCommit(file.filename, details.parentSha)
                            : null;

                        const newData = newRawData ? convertToPageData(newRawData) : null;
                        const oldData = oldRawData ? convertToPageData(oldRawData) : null;

                        return {
                            filename: file.filename,
                            pageName,
                            status: file.status,
                            oldData,
                            newData,
                        };
                    } catch (err) {
                        console.error(`Error fetching content for ${file.filename}:`, err);
                        return {
                            filename: file.filename,
                            pageName,
                            status: file.status,
                            oldData: null,
                            newData: null,
                        };
                    }
                });

                const changes = await Promise.all(fileChangePromises);
                setFileChanges(changes);

                // Auto-select first file
                if (changes.length > 0) {
                    setSelectedFilename(changes[0].filename);
                }
            } catch (err: any) {
                console.error('Error fetching commit details:', err);
                setError(err.message || 'Failed to load commit details');
            } finally {
                setLoading(false);
                setLoadingFiles(false);
            }
        };

        fetchCommitDetails();
    }, [commitSha, token]);

    const selectedFileChange = fileChanges.find(f => f.filename === selectedFilename);

    if (!commitSha) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/60 bg-muted/5">
                <div className="p-4 rounded-full bg-muted/30 mb-4">
                    <GitCommit className="h-8 w-8 opacity-40" />
                </div>
                <p className="text-base font-medium text-foreground/70">No Commit Selected</p>
                <p className="text-sm mt-1 max-w-xs text-center">Select a commit from the history sidebar to view details</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-41px)] text-muted-foreground bg-muted/5">
                <RefreshCw className="h-6 w-6 mb-4 animate-spin opacity-40" />
                <p className="text-sm font-medium">Loading details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full flex items-center justify-center p-8 bg-muted/5">
                <Alert variant="destructive" className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Loading Commit</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!commitDetails) {
        return null;
    }

    return (
        <div className="flex h-[calc(100vh-41px)] overflow-hidden bg-background">
            {/* Middle Sidebar - Commit Info & File List */}
            <div className="w-[300px] flex-shrink-0 border-r flex flex-col bg-muted/10">
                {/* Compact Commit Header */}
                <div className="p-4 border-b bg-sidebar">
                    <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-8 w-8 border shadow-sm">
                            <AvatarImage src={commitDetails.author.avatarUrl} alt={commitDetails.author.name} />
                            <AvatarFallback className="text-xs">
                                {commitDetails.author.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">{commitDetails.author.name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <span>{formatDate(commitDetails.date)}</span>
                                <span className="opacity-50">&middot;</span>
                                <span className="font-mono">{commitDetails.sha.substring(0, 7)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-sm font-medium leading-normal line-clamp-2 text-foreground/90 mb-1">
                        {commitDetails.message}
                    </div>
                </div>

                {/* File List Header */}
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/5 flex items-center justify-between border-b">
                    <span>CHANGED FILES</span>
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] min-w-[1.25rem] justify-center">
                        {fileChanges.length}
                    </Badge>
                </div>

                {/* File List */}
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-0.5">
                        {loadingFiles ? (
                            <div className="flex items-center justify-center py-8 text-muted-foreground">
                                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                <span className="text-xs">Loading changes...</span>
                            </div>
                        ) : fileChanges.length === 0 ? (
                            <div className="text-center py-8 px-4 text-xs text-muted-foreground">
                                No content files modified in this commit.
                            </div>
                        ) : (
                            fileChanges.map((file) => (
                                <button
                                    key={file.filename}
                                    onClick={() => setSelectedFilename(file.filename)}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-all text-left group",
                                        selectedFilename === file.filename
                                            ? "bg-primary/10 text-primary font-medium"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <FileText className={cn(
                                        "w-3.5 h-3.5 shrink-0 transition-colors",
                                        selectedFilename === file.filename ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground/70"
                                    )} />
                                    <span className="truncate flex-1 text-xs">{file.pageName}</span>
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full shrink-0",
                                        file.status === 'added' && "bg-green-500",
                                        file.status === 'removed' && "bg-red-500",
                                        file.status === 'modified' && "bg-orange-500"
                                    )} />
                                </button>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Right Main Pane - Diff View */}
            <div className="flex-1 flex flex-col min-w-0 bg-card h-full">
                {selectedFileChange ? (
                    <>
                        <div className="h-14 shrink-0 border-b flex items-center justify-between px-6 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-sm">{selectedFileChange.pageName}</span>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "text-[10px] px-1.5 h-5 border-0 font-medium",
                                        selectedFileChange.status === 'added' && "bg-green-500/10 text-green-600",
                                        selectedFileChange.status === 'removed' && "bg-red-500/10 text-red-600",
                                        selectedFileChange.status === 'modified' && "bg-orange-500/10 text-orange-600"
                                    )}
                                >
                                    {selectedFileChange.status.toUpperCase()}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden relative">
                            {selectedFileChange.oldData || selectedFileChange.newData ? (
                                <ScrollArea className="h-full">
                                    <div className="p-6 max-w-5xl mx-auto">
                                        <DiffView
                                            oldPageData={selectedFileChange.oldData || { components: [] }}
                                            newPageData={selectedFileChange.newData || { components: [] }}
                                            hideHeader={true}
                                            onRecoverField={handleRecoverField}
                                            pageName={selectedFileChange.pageName}
                                        />
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
                                    <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
                                    <p className="text-sm">Unable to diff this file type</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 bg-muted/5">
                        <FileText className="h-10 w-10 mb-3 opacity-20" />
                        <p className="text-sm font-medium">Select a file to view changes</p>
                    </div>
                )}
            </div>
        </div>
    );
}
