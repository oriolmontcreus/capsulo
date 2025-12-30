import { useState, useEffect, useMemo } from 'react';
import { GitCommit, User, Loader2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GitHubAPI, type CommitInfo } from '@/lib/github-api';
import { useAuthContext } from '../AuthProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HistoryListProps {
    selectedCommit: string | null;
    onCommitSelect: (sha: string) => void;
    className?: string;
}

// Group commits by date
function groupCommitsByDate(commits: CommitInfo[]): Map<string, CommitInfo[]> {
    const groups = new Map<string, CommitInfo[]>();

    commits.forEach(commit => {
        const date = new Date(commit.date);
        const dateKey = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const existing = groups.get(dateKey) || [];
        existing.push(commit);
        groups.set(dateKey, existing);
    });

    return groups;
}

// Get relative time string
function getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return `${diffMonths}mo ago`;
}

function CommitListItem({
    commit,
    isSelected,
    onSelect
}: {
    commit: CommitInfo;
    isSelected: boolean;
    onSelect: () => void;
}) {
    // Get first line of commit message
    const firstLine = commit.message.split('\n')[0];

    return (
        <li>
            <button
                type="button"
                onClick={onSelect}
                className={cn(
                    "w-full flex flex-col gap-1.5 px-3 py-2.5 text-sm rounded-md transition-colors text-left",
                    isSelected
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
            >
                <span className="font-medium line-clamp-2">{firstLine}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Avatar className="h-4 w-4">
                        <AvatarImage src={commit.author.avatarUrl} alt={commit.author.name} />
                        <AvatarFallback className="text-[8px]">
                            {commit.author.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <a
                        href={`https://github.com/commit/${commit.sha}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                    >
                        #{commit.shortSha}
                    </a>
                    <span>•</span>
                    <span>{getRelativeTime(commit.date)}</span>
                </div>
            </button>
        </li>
    );
}

export function HistoryList({ selectedCommit, onCommitSelect, className = '' }: HistoryListProps) {
    const { token } = useAuthContext();
    const [commits, setCommits] = useState<CommitInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;

        const fetchCommits = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const github = new GitHubAPI(token);
                const fetchedCommits = await github.getCommits();
                setCommits(fetchedCommits);

                // Auto-select first commit if none selected
                if (fetchedCommits.length > 0 && !selectedCommit) {
                    onCommitSelect(fetchedCommits[0].sha);
                }
            } catch (err: any) {
                console.error('Error fetching commits:', err);
                setError(err.message || 'Failed to load commit history');
            } finally {
                setIsLoading(false);
            }
        };

        fetchCommits();
    }, [token]);

    const groupedCommits = useMemo(() => groupCommitsByDate(commits), [commits]);

    if (isLoading) {
        return (
            <div className={`flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground ${className}`}>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading history...
            </div>
        );
    }

    if (error) {
        return (
            <div className={`px-4 py-8 text-center text-sm text-destructive ${className}`}>
                {error}
            </div>
        );
    }

    if (commits.length === 0) {
        return (
            <div className={`px-4 py-8 text-center text-sm text-muted-foreground ${className}`}>
                No commits found on draft branch
            </div>
        );
    }

    return (
        <ScrollArea className={`flex-1 overflow-auto ${className}`}>
            {Array.from(groupedCommits.entries()).map(([date, dateCommits]) => (
                <div key={date} className="mb-4">
                    <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-sidebar">
                        <Calendar className="h-3 w-3" />
                        {date}
                    </div>
                    <ul className="space-y-0.5 px-2">
                        {dateCommits.map((commit) => (
                            <CommitListItem
                                key={commit.sha}
                                commit={commit}
                                isSelected={selectedCommit === commit.sha}
                                onSelect={() => onCommitSelect(commit.sha)}
                            />
                        ))}
                    </ul>
                </div>
            ))}
        </ScrollArea>
    );
}
