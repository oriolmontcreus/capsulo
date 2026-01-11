import * as React from "react";
import { MessageSquare, SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCMSContext } from "@/lib/ai/useCMSContext";
import { useTranslation } from "@/lib/form-builder/context/TranslationContext";
import { useChatState } from "./hooks/useChatState";
import { useAIStreaming } from "./hooks/useAIStreaming";
import { useActionHandler } from "./hooks/useActionHandler";
import { MessageList } from "./components/MessageList";
import { ChatHistory } from "./components/ChatHistory";
import { ChatInput } from "./components/ChatInput";
import { StatusBanner } from "./components/StatusBanner";

interface ChatInterfaceProps {
    onViewChange?: (view: 'content' | 'globals' | 'changes' | 'history') => void;
}

export function ChatInterface({ onViewChange }: ChatInterfaceProps) {
    const { pageData, globalData, selectedPage, error: cmsError, isLoading: isLoadingCMS } = useCMSContext();
    const { defaultLocale } = useTranslation();
    
    // Chat state management
    const {
        messages,
        setMessages,
        conversations,
        currentConversationId,
        isHistoryOpen,
        setIsHistoryOpen,
        storageError,
        createNewChat,
        loadConversation,
        deleteConversation,
        updateConversationTitle
    } = useChatState();
    
    // AI streaming
    const { isStreaming, handleSubmit: submitToAI } = useAIStreaming({
        currentConversationId,
        messages,
        setMessages,
        setStorageError: (error) => {}, // Already handled in useChatState
        updateConversationTitle
    });
    
    // Action handling
    const { handleApplyAction } = useActionHandler(defaultLocale);
    
    // Input state
    const [input, setInput] = React.useState("");
    
    const handleSubmit = () => {
        if (!input.trim() || isStreaming) return;
        
        const context = {
            page: { id: selectedPage, data: pageData },
            globals: globalData
        };
        
        submitToAI(input, context);
        setInput("");
    };
    
    const handleApply = (messageId: string, actionData: any) => {
        handleApplyAction(messageId, actionData, setMessages);
    };
    
    const handleCreateNewChat = () => {
        if (!isStreaming) {
            createNewChat();
        }
    };
    
    const handleLoadConversation = (id: string) => {
        if (!isStreaming) {
            loadConversation(id);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center px-4 py-3 border-b bg-muted/30 shrink-0 h-[41px]">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-6 h-6 mr-2" 
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                >
                    <MessageSquare className="w-4 h-4" />
                </Button>
                <div className="flex-1 min-w-0">
                     <h3 className="text-sm font-medium truncate">
                         {conversations.find(c => c.id === currentConversationId)?.title || "New Chat"}
                     </h3>
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-6 h-6 ml-2 text-muted-foreground hover:text-foreground" 
                    onClick={handleCreateNewChat} 
                    title="New Chat" 
                    disabled={isStreaming}
                >
                    <SquarePen className="w-4 h-4" />
                </Button>
            </div>

            {/* Status Banners */}
            <StatusBanner 
                cmsError={cmsError}
                storageError={storageError}
                isLoadingCMS={isLoadingCMS}
                hasPageData={!!pageData}
            />

            {/* History Overlay */}
            {isHistoryOpen && (
                <ChatHistory
                    conversations={conversations}
                    currentConversationId={currentConversationId}
                    isStreaming={isStreaming}
                    onLoadConversation={handleLoadConversation}
                    onDeleteConversation={deleteConversation}
                />
            )}

            {/* Messages Area */}
            <MessageList
                messages={messages}
                isStreaming={isStreaming}
                onApplyAction={handleApply}
                onViewChange={onViewChange}
            />

            {/* Input Area */}
            <ChatInput
                input={input}
                isStreaming={isStreaming}
                onInputChange={setInput}
                onSubmit={handleSubmit}
            />
        </div>
    );
}
