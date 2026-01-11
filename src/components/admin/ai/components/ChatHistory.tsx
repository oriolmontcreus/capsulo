import * as React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/lib/ai/types";

interface ChatHistoryProps {
    conversations: Conversation[];
    currentConversationId: string | null;
    isStreaming: boolean;
    onLoadConversation: (id: string) => void;
    onDeleteConversation: (e: React.MouseEvent, id: string) => void;
}

export function ChatHistory({
    conversations,
    currentConversationId,
    isStreaming,
    onLoadConversation,
    onDeleteConversation
}: ChatHistoryProps) {
    return (
        <div className="absolute top-[41px] left-0 w-full h-[calc(100%-41px)] bg-background/95 backdrop-blur-sm z-50 flex flex-col p-4 border-r animate-in slide-in-from-left-2 duration-200">
            <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Recent Chats</h4>
            <ScrollArea className="flex-1 -mx-2 px-2">
                <div className="space-y-1">
                    {conversations.map(c => (
                        <div 
                            key={c.id} 
                            onClick={() => onLoadConversation(c.id)}
                            className={cn(
                                "flex items-center justify-between p-2 rounded-md text-sm cursor-pointer hover:bg-accent group",
                                currentConversationId === c.id ? "bg-accent/80 font-medium" : "",
                                isStreaming && "opacity-50 pointer-events-none"
                            )}
                        >
                            <span className="truncate flex-1 pr-2">{c.title}</span>
                            <Button 
                               variant="ghost" 
                               size="icon" 
                               className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10 hover:text-destructive"
                               onClick={(e) => onDeleteConversation(e, c.id)}
                               disabled={isStreaming}
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
