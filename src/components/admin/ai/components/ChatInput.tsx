import * as React from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";

interface ChatInputProps {
    input: string;
    isStreaming: boolean;
    onInputChange: (value: string) => void;
    onSubmit: () => void;
}

export function ChatInput({ input, isStreaming, onInputChange, onSubmit }: ChatInputProps) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
        }
    };

    return (
        <div className="p-4 border-t bg-background shrink-0">
            <div className="relative">
                <Textarea 
                    value={input}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask AI to edit content..."
                    className="min-h-[80px] max-h-[160px] pr-10 resize-none font-normal"
                    disabled={isStreaming}
                />
                <Button 
                    size="icon" 
                    variant="ghost" 
                    className="absolute right-2 bottom-2 h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={onSubmit}
                    disabled={!input.trim() || isStreaming}
                >
                    {isStreaming ? <Spinner className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                </Button>
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground text-center flex justify-between px-1">
                <span>Llama 3.3 70B</span>
                <span>AI can make mistakes. Review edits.</span>
            </div>
        </div>
    );
}
