import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/lib/ai/types";

interface ChatHistoryProps {
    conversations: Conversation[];
    currentConversationId: string | null;
    isStreaming: boolean;
    onLoadConversation: (id: string) => void;
    onDeleteConversation: (e: React.MouseEvent, id: string) => void;
    onRenameConversation: (id: string, title: string) => void;
    onCreateNewChat: () => void;
}

export function ChatHistory({
    conversations,
    currentConversationId,
    isStreaming,
    onLoadConversation,
    onDeleteConversation,
    onRenameConversation,
    onCreateNewChat
}: ChatHistoryProps) {
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [draftTitle, setDraftTitle] = React.useState("");
    const skipCommitAfterCancelRef = React.useRef(false);
    /** Cleared synchronously on commit/cancel so blur does not double-save after Enter. */
    const editingIdRef = React.useRef<string | null>(null);

    const commitRename = React.useCallback(() => {
        if (skipCommitAfterCancelRef.current) {
            skipCommitAfterCancelRef.current = false;
            return;
        }
        const id = editingIdRef.current;
        if (!id) return;
        const next = draftTitle.trim();
        const conv = conversations.find((c) => c.id === id);
        editingIdRef.current = null;
        setEditingId(null);
        if (!conv) return;
        if (!next || next === conv.title) return;
        onRenameConversation(id, next);
    }, [conversations, draftTitle, onRenameConversation]);

    const cancelRename = React.useCallback(() => {
        skipCommitAfterCancelRef.current = true;
        editingIdRef.current = null;
        setEditingId(null);
    }, []);

    return (
        <div className="absolute top-[41px] left-0 w-full h-[calc(100%-41px)] bg-background/95 backdrop-blur-sm z-50 flex flex-col p-4 border-r animate-in slide-in-from-left-2 duration-200">
            <div className="flex items-center justify-between mb-4 mt-1">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/60">Recent</h4>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onCreateNewChat}
                    disabled={isStreaming}
                    title="New Chat"
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
            <ScrollArea className="flex-1 -mx-2 px-2">
                <div className="space-y-1">
                    {conversations.map(c => (
                        <div
                            key={c.id}
                            onClick={() => {
                                if (editingId === c.id) return;
                                onLoadConversation(c.id);
                            }}
                            className={cn(
                                "flex items-center justify-between gap-1 p-2 rounded-md text-sm cursor-pointer hover:bg-accent group",
                                currentConversationId === c.id ? "bg-accent/80 font-medium" : "",
                                isStreaming && "opacity-50 pointer-events-none"
                            )}
                        >
                            {editingId === c.id ? (
                                <Input
                                    autoFocus
                                    value={draftTitle}
                                    onChange={(e) => setDraftTitle(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            commitRename();
                                        } else if (e.key === "Escape") {
                                            e.preventDefault();
                                            cancelRename();
                                        }
                                    }}
                                    onBlur={commitRename}
                                    className="h-8 flex-1 min-w-0 text-sm py-1"
                                    disabled={isStreaming}
                                    aria-label="Chat title"
                                />
                            ) : (
                                <span className="truncate flex-1 min-w-0 pr-1">{c.title}</span>
                            )}
                            <div
                                className="flex shrink-0 items-center gap-0.5"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {editingId !== c.id && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 transition-opacity text-muted-foreground hover:bg-accent hover:text-foreground"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            editingIdRef.current = c.id;
                                            setEditingId(c.id);
                                            setDraftTitle(c.title);
                                        }}
                                        disabled={isStreaming}
                                        aria-label="Edit chat title"
                                        title="Rename"
                                    >
                                        <Pencil className="w-3 h-3" />
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 transition-opacity text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={(e) => onDeleteConversation(e, c.id)}
                                    disabled={isStreaming}
                                    aria-label="Delete chat"
                                    title="Delete"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
