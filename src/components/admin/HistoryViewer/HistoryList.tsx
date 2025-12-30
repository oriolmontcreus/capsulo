import { useState, useEffect, useMemo } from 'react';
import { Loader2, Check, GitGraph, HashIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GitHubAPI, type CommitInfo } from '@/lib/github-api';
import { useAuthContext } from '../AuthProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

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
    const [copied, setCopied] = useState(false);

    // Split message into subject and body
    const lines = commit.message.split('\n').filter(line => line.trim() !== '');
    const subject = lines[0];
    const body = lines.slice(1).join(' ');

    const handleCopyHash = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(commit.sha);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <li className="border-b last:border-0 border-sidebar-border/50">
            <div
                role="button"
                tabIndex={0}
                onClick={onSelect}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect();
                    }
                }}
                className={cn(
                    "w-full flex flex-col gap-2 px-4 py-3 text-sm transition-colors text-left focus:outline-none rounded-none group relative overflow-hidden cursor-pointer",
                    isSelected
                        ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-[3px] border-l-primary pl-[13px]"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 border-l-[3px] border-l-transparent pl-[13px]"
                )}
            >
                <div>
                    <span className={cn("font-medium block leading-tight", !isSelected && "group-hover:text-sidebar-accent-foreground")}>
                        {subject}
                    </span>

                    {body && (
                        <span className={cn("line-clamp-2 text-xs mt-1 block", isSelected ? "opacity-80" : "text-muted-foreground")}>
                            {body}
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-between w-full mt-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-4 w-4 border border-background/50 shrink-0">
                            <AvatarImage src={commit.author.avatarUrl} alt={commit.author.name} />
                            <AvatarFallback className="text-[9px]">
                                {commit.author.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <span className={cn("text-xs truncate font-medium", isSelected ? "opacity-90" : "text-muted-foreground")}>
                            {commit.author.name}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 pl-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    onClick={handleCopyHash}
                                    className={cn(
                                        "font-mono hover:text-primary transition-colors flex items-center gap-1 px-1 py-0.5 rounded cursor-pointer",
                                        isSelected ? "bg-background/20" : "hover:bg-sidebar-accent"
                                    )}
                                >
                                    <span className="size-3 flex items-center justify-center">
                                        {copied ? (
                                            <Check className="size-3 text-green-500" />
                                        ) : (
                                            <HashIcon className="size-3 text-muted-foreground" />
                                        )}
                                    </span>
                                    {commit.shortSha}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Copy full hash</p>
                            </TooltipContent>
                        </Tooltip>
                        <span>•</span>
                        <span className="whitespace-nowrap">{getRelativeTime(commit.date)}</span>
                    </div>
                </div>
            </div>
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
                <div key={date}>
                    <div className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-muted-foreground bg-sidebar">
                        <GitGraph className="h-3.5 w-3.5" />
                        {date}
                    </div>
                    <ul className="px-0">
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
