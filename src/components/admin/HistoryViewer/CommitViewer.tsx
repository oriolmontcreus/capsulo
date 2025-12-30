import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, FileText, GitCommit, ChevronDown, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GitHubAPI } from '@/lib/github-api';
import { useAuthContext } from '../AuthProvider';
import { DiffView } from '../ChangesViewer/DiffView';
import { convertToPageData } from '../ChangesViewer/utils';
import type { PageData } from '@/lib/form-builder';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

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
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Extract page name from file path (e.g., "src/content/pages/index.json" -> "index")
function getPageNameFromPath(path: string): string {
    const match = path.match(/src\/content\/pages\/(.+)\.json$/);
    if (match) return match[1];

    // Check for globals
    if (path.includes('globals.json')) return 'globals';

    return path.split('/').pop()?.replace('.json', '') || path;
}

// Check if file is a content file we can show diffs for
function isContentFile(filename: string): boolean {
    // Page content files
    if (filename.startsWith('src/content/pages/') && filename.endsWith('.json')) {
        return true;
    }
    // Globals file
    if (filename.includes('globals.json')) {
        return true;
    }
    return false;
}

// File change card component
function FileChangeCard({
    fileChange,
    isExpanded,
    onToggle
}: {
    fileChange: FileChange;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const hasData = fileChange.oldData || fileChange.newData;

    return (
        <div className="border rounded-lg overflow-hidden">
            <button
                type="button"
                onClick={onToggle}
                className={cn(
                    "w-full flex items-center justify-between p-4 text-left transition-colors",
                    "hover:bg-muted/50",
                    isExpanded && "bg-muted/30"
                )}
            >
                <div className="flex items-center gap-3">
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{fileChange.pageName}</span>
                    <Badge
                        variant="secondary"
                        className={cn(
                            "text-xs",
                            fileChange.status === 'added' && "bg-green-600/20 text-green-500",
                            fileChange.status === 'removed' && "bg-red-600/20 text-red-500",
                            fileChange.status === 'modified' && "bg-yellow-600/20 text-yellow-500"
                        )}
                    >
                        {fileChange.status}
                    </Badge>
                </div>
            </button>

            {isExpanded && hasData && (
                <div className="border-t">
                    <DiffView
                        oldPageData={fileChange.oldData || { components: [] }}
                        newPageData={fileChange.newData || { components: [] }}
                    />
                </div>
            )}

            {isExpanded && !hasData && (
                <div className="p-8 text-center text-muted-foreground border-t">
                    Unable to load diff for this file
                </div>
            )}
        </div>
    );
}

export function CommitViewer({ commitSha }: CommitViewerProps) {
    const { token } = useAuthContext();
    const [commitDetails, setCommitDetails] = useState<CommitDetails | null>(null);
    const [fileChanges, setFileChanges] = useState<FileChange[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!commitSha || !token) {
            setCommitDetails(null);
            setFileChanges([]);
            return;
        }

        const fetchCommitDetails = async () => {
            setLoading(true);
            setError(null);
            setIsVisible(false);
            setExpandedFiles(new Set());

            try {
                const github = new GitHubAPI(token);
                const details = await github.getCommitDetails(commitSha);
                setCommitDetails(details);

                // Trigger fade-in
                requestAnimationFrame(() => {
                    setIsVisible(true);
                });

                // Now fetch the actual file contents for content files
                setLoadingFiles(true);
                const contentFiles = details.files.filter(f => isContentFile(f.filename));

                const fileChangePromises = contentFiles.map(async (file) => {
                    const pageName = getPageNameFromPath(file.filename);

                    try {
                        // Fetch new version (at this commit)
                        const newRawData = file.status !== 'removed'
                            ? await github.getFileContentAtCommit(file.filename, commitSha)
                            : null;

                        // Fetch old version (at parent commit) if parent exists
                        const oldRawData = details.parentSha && file.status !== 'added'
                            ? await github.getFileContentAtCommit(file.filename, details.parentSha)
                            : null;

                        // Convert to PageData structure (handles globals vs pages)
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

                // Auto-expand first file
                if (changes.length > 0) {
                    setExpandedFiles(new Set([changes[0].filename]));
                }
            } catch (err: any) {
                console.error('Error fetching commit details:', err);
                setError(err.message || 'Failed to load commit details');
                setIsVisible(true);
            } finally {
                setLoading(false);
                setLoadingFiles(false);
            }
        };

        fetchCommitDetails();
    }, [commitSha, token]);

    const toggleFile = (filename: string) => {
        setExpandedFiles(prev => {
            const next = new Set(prev);
            if (next.has(filename)) {
                next.delete(filename);
            } else {
                next.add(filename);
            }
            return next;
        });
    };

    if (!commitSha) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground">
                <GitCommit className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-lg font-medium text-foreground/80">Select a commit</p>
                <p className="text-sm mt-1">Choose a commit from the sidebar to view its changes</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <RefreshCw className="h-8 w-8 mb-4 animate-spin opacity-40" />
                <p className="text-sm">Loading commit details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div
                className="p-8 transition-opacity duration-300"
                style={{ opacity: isVisible ? 1 : 0 }}
            >
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!commitDetails) {
        return null;
    }

    // Split commit message into title and body
    const [title, ...bodyLines] = commitDetails.message.split('\n');
    const body = bodyLines.join('\n').trim();

    return (
        <ScrollArea
            className="flex-1 overflow-auto transition-opacity duration-300 ease-out"
            style={{ opacity: isVisible ? 1 : 0 }}
        >
            {/* Commit Header */}
            <div className="p-8 border-b">
                <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={commitDetails.author.avatarUrl} alt={commitDetails.author.name} />
                        <AvatarFallback className="text-lg">
                            {commitDetails.author.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold tracking-tight mb-2">{title}</h1>
                        {body && (
                            <p className="text-muted-foreground whitespace-pre-wrap mb-4">{body}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{commitDetails.author.name}</span>
                            <span>committed</span>
                            <span>{formatDate(commitDetails.date)}</span>
                        </div>
                        <div className="mt-2">
                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                {commitDetails.sha}
                            </code>
                        </div>
                    </div>
                </div>
            </div>

            {/* Files Changed */}
            <div className="p-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Files Changed
                    <Badge variant="secondary" className="ml-2">
                        {fileChanges.length}
                    </Badge>
                    {loadingFiles && (
                        <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground ml-2" />
                    )}
                </h2>

                {fileChanges.length === 0 && !loadingFiles && (
                    <div className="text-center text-muted-foreground py-8">
                        No content files changed in this commit
                    </div>
                )}

                <div className="space-y-4">
                    {fileChanges.map((fileChange) => (
                        <FileChangeCard
                            key={fileChange.filename}
                            fileChange={fileChange}
                            isExpanded={expandedFiles.has(fileChange.filename)}
                            onToggle={() => toggleFile(fileChange.filename)}
                        />
                    ))}
                </div>
            </div>
        </ScrollArea>
    );
}
