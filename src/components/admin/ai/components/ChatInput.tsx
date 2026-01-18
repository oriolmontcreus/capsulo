import * as React from "react";
import { 
    PromptInput, 
    PromptInputBody, 
    type PromptInputMessage, 
    PromptInputSubmit, 
    PromptInputTextarea, 
    PromptInputFooter, 
    PromptInputTools 
} from "@/components/ai-elements/prompt-input";

interface ChatInputProps {
    input: string;
    isStreaming: boolean;
    onInputChange: (value: string) => void;
    onSubmit: () => void;
}

export function ChatInput({ input, isStreaming, onInputChange, onSubmit }: ChatInputProps) {
    const handleSubmit = (message: PromptInputMessage) => {
        const hasText = Boolean(message.text);
        if (!hasText) {
            return;
        }
        onSubmit();
    };

    const status = isStreaming ? 'streaming' : undefined;

    return (
        <div className="p-4 border-t bg-background shrink-0">
            <PromptInput onSubmit={handleSubmit}>
                <PromptInputBody>
                    <PromptInputTextarea 
                        onChange={(e) => onInputChange(e.target.value)}
                        value={input}
                        placeholder="Ask AI to edit content..."
                        className="min-h-[80px] max-h-[160px]"
                    />
                </PromptInputBody>
                <PromptInputFooter>
                    <PromptInputTools>
                        <div className="text-[10px] text-muted-foreground">
                            <span>Llama 3.3 70B</span>
                        </div>
                    </PromptInputTools>
                    <PromptInputSubmit 
                        disabled={!input.trim() || isStreaming} 
                        status={status}
                    />
                </PromptInputFooter>
            </PromptInput>
            <div className="mt-2 text-[10px] text-muted-foreground text-center">
                <span>AI can make mistakes. Review edits.</span>
            </div>
        </div>
    );
}
