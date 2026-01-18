import * as React from "react";
import { MessageSquare } from "lucide-react";
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
import { 
    Conversation, 
    ConversationContent, 
    ConversationScrollButton 
} from "@/components/ai-elements/conversation";

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
        isInitializing,
        createNewChat,
        loadConversation,
        deleteConversation,
        updateConversationTitle
    } = useChatState();
    
    // Action handling (needed before streaming hook)
    const { handleApplyAction } = useActionHandler(defaultLocale);
    
    // Ref to always have latest messages for the action handler without stale closures
    const messagesRef = React.useRef(messages);
    messagesRef.current = messages;
    
    // Unified action apply callback
    const handleApply = React.useCallback((messageId: string, actionData: any, setMsgs?: React.Dispatch<React.SetStateAction<any[]>>) => {
        handleApplyAction(messageId, actionData, setMsgs ?? setMessages, { 
            pageData, 
            globalData, 
            selectedPage: selectedPage || undefined,
            conversationId: currentConversationId,
            messages: messagesRef.current
        });
    }, [handleApplyAction, pageData, globalData, setMessages, selectedPage, currentConversationId]);
    
    // AI streaming with auto-apply
    const { isStreaming, handleSubmit: submitToAI } = useAIStreaming({
        currentConversationId,
        messages,
        setMessages,
        setStorageError: (error) => {}, // Already handled in useChatState
        updateConversationTitle,
        onAutoApplyAction: handleApply
    });
    
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
                    className="w-6 h-6 mr-3 text-muted-foreground hover:text-foreground transition-colors" 
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                    title="Chat History"
                >
                    <MessageSquare className="w-4 h-4" />
                </Button>
                <div className="flex-1 min-w-0">
                     <h3 className="text-sm font-medium truncate text-muted-foreground/80">
                         {isInitializing ? (
                             <span className="opacity-0">Loading...</span>
                         ) : (
                             conversations.find(c => c.id === currentConversationId)?.title || "New Chat"
                         )}
                     </h3>
                </div>
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
                    onCreateNewChat={handleCreateNewChat}
                />
            )}

            {/* Messages Area */}
            <Conversation className="flex-1 w-full min-h-0">
                <ConversationContent className="p-4 md:p-6 lg:p-8">
                    <MessageList
                        messages={messages}
                        isStreaming={isStreaming}
                        onApplyAction={handleApply}
                        onViewChange={onViewChange}
                        defaultLocale={defaultLocale}
                    />
                </ConversationContent>
                <ConversationScrollButton />
            </Conversation>

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
