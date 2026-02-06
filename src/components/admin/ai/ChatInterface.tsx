import { AlertCircle, MessageSquare, X } from "lucide-react";
import * as React from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAIMode } from "@/hooks/use-ai-mode";
import { getContextStatus } from "@/lib/ai/contextMonitor";
import type { AIMode } from "@/lib/ai/modelConfig";
import { setStoredMode } from "@/lib/ai/modelConfig";
import type { Attachment } from "@/lib/ai/types";
import { useCMSContext } from "@/lib/ai/useCMSContext";
import { useTranslation } from "@/lib/form-builder/context/TranslationContext";
import { ChatHistory } from "./components/ChatHistory";
import { ChatInput } from "./components/ChatInput";
import { ContextIndicator } from "./components/ContextIndicator";
import { ContextWarning } from "./components/ContextWarning";
import { MessageList } from "./components/MessageList";
import { StatusBanner } from "./components/StatusBanner";
import { useActionHandler } from "./hooks/useActionHandler";
import { useAIStreaming } from "./hooks/useAIStreaming";
import { useChatState } from "./hooks/useChatState";

interface ChatInterfaceProps {
  onViewChange?: (view: "content" | "globals" | "changes" | "history") => void;
}

export function ChatInterface({ onViewChange }: ChatInterfaceProps) {
  const {
    pageData,
    globalData,
    selectedPage,
    error: cmsError,
    isLoading: isLoadingCMS,
  } = useCMSContext();
  const { defaultLocale } = useTranslation();

  // AI Mode management
  const { mode, setMode, isLoaded: isModeLoaded } = useAIMode();

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
    updateConversationTitle,
  } = useChatState();

  // Action handling (needed before streaming hook)
  const { handleApplyAction } = useActionHandler(defaultLocale);

  // Ref to always have latest messages for the action handler without stale closures
  const messagesRef = React.useRef(messages);
  messagesRef.current = messages;

  // Unified action apply callback
  const handleApply = React.useCallback(
    (
      messageId: string,
      actionData: any,
      setMsgs?: React.Dispatch<React.SetStateAction<any[]>>
    ) => {
      handleApplyAction(messageId, actionData, setMsgs ?? setMessages, {
        pageData,
        globalData,
        selectedPage: selectedPage || undefined,
        conversationId: currentConversationId,
        messages: messagesRef.current,
      });
    },
    [
      handleApplyAction,
      pageData,
      globalData,
      setMessages,
      selectedPage,
      currentConversationId,
    ]
  );

  // AI streaming with auto-apply
  const {
    isStreaming,
    error: aiError,
    clearError: clearAIError,
    handleSubmit: submitToAI,
  } = useAIStreaming({
    currentConversationId,
    messages,
    setMessages,
    setStorageError: () => {},
    updateConversationTitle,
    onAutoApplyAction: handleApply,
    mode,
  });

  // Calculate context status
  const contextStatus = React.useMemo(() => {
    if (!isModeLoaded) return null;

    const allMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const context = {
      page: { id: selectedPage, data: pageData },
      globals: globalData,
    };

    return getContextStatus(allMessages, mode, context);
  }, [messages, mode, pageData, globalData, selectedPage, isModeLoaded]);

  // Handle mode change
  const handleModeChange = React.useCallback(
    (newMode: AIMode) => {
      if (isStreaming) return;
      setMode(newMode);
      setStoredMode(newMode);
    },
    [isStreaming, setMode]
  );

  // Handle new chat
  const handleCreateNewChat = React.useCallback(() => {
    if (!isStreaming) {
      clearAIError();
      createNewChat();
    }
  }, [isStreaming, createNewChat, clearAIError]);

  // Handle load conversation
  const handleLoadConversation = React.useCallback(
    (id: string) => {
      if (!isStreaming) {
        clearAIError();
        loadConversation(id);
      }
    },
    [isStreaming, loadConversation, clearAIError]
  );

  // Handle submit from ChatInput
  const handleChatSubmit = React.useCallback(
    async (input: string, attachments?: Attachment[]) => {
      if (!input.trim()) return;

      // Auto-switch to Smart mode if attachments in Fast mode
      if (attachments && attachments.length > 0 && mode === "fast") {
        console.log(
          "[ChatInterface] Auto-switching to Smart mode for attachments"
        );
        handleModeChange("smart");
      }

      const context = {
        page: { id: selectedPage, data: pageData },
        globals: globalData,
      };

      await submitToAI(input, context, attachments);
    },
    [mode, handleModeChange, selectedPage, pageData, globalData, submitToAI]
  );

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex h-[41px] shrink-0 items-center border-b bg-muted/30 px-4 py-3">
        <Button
          className="mr-3 h-6 w-6 text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          size="icon"
          title="Chat History"
          variant="ghost"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-muted-foreground/80 text-sm">
            {isInitializing ? (
              <span className="opacity-0">Loading...</span>
            ) : (
              conversations.find((c) => c.id === currentConversationId)
                ?.title || "New Chat"
            )}
          </h3>
        </div>

        {/* Context Indicator */}
        <div className="flex items-center gap-2">
          {contextStatus && (
            <ContextIndicator percentage={contextStatus.percentage} />
          )}
        </div>
      </div>

      {/* Status Banners */}
      <StatusBanner
        cmsError={cmsError}
        hasPageData={!!pageData}
        isLoadingCMS={isLoadingCMS}
        storageError={storageError}
      />

      {/* AI Error Alert */}
      {aiError && (
        <div className="fade-in slide-in-from-top-2 animate-in px-4 pt-4 duration-300">
          <Alert className="relative" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{aiError}</AlertDescription>
            <Button
              className="absolute top-2 right-2 h-6 w-6"
              onClick={clearAIError}
              size="icon"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        </div>
      )}

      {/* Context Warning */}
      {contextStatus?.isWarning && (
        <div className="px-4 pt-4">
          <ContextWarning
            onNewChat={handleCreateNewChat}
            onSwitchMode={() => handleModeChange("smart")}
            percentage={contextStatus.percentage}
          />
        </div>
      )}

      {/* History Overlay */}
      {isHistoryOpen && (
        <ChatHistory
          conversations={conversations}
          currentConversationId={currentConversationId}
          isStreaming={isStreaming}
          onCreateNewChat={handleCreateNewChat}
          onDeleteConversation={deleteConversation}
          onLoadConversation={handleLoadConversation}
        />
      )}

      {/* Messages Area */}
      <Conversation className="min-h-0 w-full flex-1">
        <ConversationContent className="p-4 md:p-6 lg:p-8">
          <MessageList
            defaultLocale={defaultLocale}
            isStreaming={isStreaming}
            messages={messages}
            onApplyAction={handleApply}
            onViewChange={onViewChange}
          />
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input Area */}
      <ChatInput
        isStreaming={isStreaming}
        mode={mode}
        onModeChange={handleModeChange}
        onSubmit={handleChatSubmit}
      />
    </div>
  );
}
