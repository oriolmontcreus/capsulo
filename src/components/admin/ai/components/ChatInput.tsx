import type { Attachment } from "@/lib/ai/types";
import { 
    PromptInput, 
    PromptInputBody, 
    type PromptInputMessage, 
    PromptInputSubmit, 
    PromptInputTextarea, 
    PromptInputFooter, 
    PromptInputTools,
    PromptInputHeader,
    PromptInputAttachments,
    PromptInputAttachment,
    PromptInputButton,
    usePromptInputAttachments
} from "@/components/ai-elements/prompt-input";
import { ImageIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatInputProps {
    input: string;
    isStreaming: boolean;
    onInputChange: (value: string) => void;
    onSubmit: (attachments?: Attachment[]) => void;
}

/**
 * Convert a data URL to our Attachment format
 */
function dataUrlToAttachment(dataUrl: string, filename?: string): Attachment | null {
    // Parse data URL: data:image/jpeg;base64,/9j/...
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;

    const mimeType = match[1];
    const data = match[2];

    // Only support images for now
    if (!mimeType.startsWith('image/')) return null;

    return {
        type: 'image',
        data, // Just the base64 part, without prefix
        mimeType,
        name: filename
    };
}

// Component that uses attachments hook - MUST be inside PromptInput
function AttachmentButton({ isStreaming }: { isStreaming: boolean }) {
    const attachments = usePromptInputAttachments();

    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <PromptInputButton
                        onClick={() => attachments.openFileDialog()}
                        disabled={isStreaming}
                    >
                        <ImageIcon className="size-4" />
                    </PromptInputButton>
                </TooltipTrigger>
                <TooltipContent side="top">
                    Attach image (paste or drag & drop also works)
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

// Conditionally render attachments header only when attachments exist
function AttachmentsHeader() {
    const attachments = usePromptInputAttachments();

    if (attachments.files.length === 0) {
        return null;
    }

    return (
        <PromptInputHeader>
            <PromptInputAttachments>
                {(file) => <PromptInputAttachment key={file.id} data={file} />}
            </PromptInputAttachments>
        </PromptInputHeader>
    );
}

// Submit button wrapper that checks for attachments - MUST be inside PromptInput
function SubmitButton({ input, isStreaming }: { input: string; isStreaming: boolean }) {
    const attachments = usePromptInputAttachments();
    const hasAttachments = attachments.files.length > 0;
    const status = isStreaming ? 'streaming' : undefined;

    return (
        <PromptInputSubmit
            disabled={(!input.trim() && !hasAttachments) || isStreaming}
            status={status}
        />
    );
}

// Dynamic placeholder based on attachments - MUST be inside PromptInput
function ChatTextarea({ input, onInputChange }: { input: string; onInputChange: (value: string) => void }) {
    const attachments = usePromptInputAttachments();
    const hasAttachments = attachments.files.length > 0;

    return (
        <PromptInputTextarea
            onChange={(e) => onInputChange(e.target.value)}
            value={input}
            placeholder={hasAttachments ? "Describe what you want to do with this image..." : "Ask AI to edit content..."}
            className="min-h-[80px] max-h-[160px]"
        />
    );
}

export function ChatInput({ input, isStreaming, onInputChange, onSubmit }: ChatInputProps) {
    const handleSubmit = async (message: PromptInputMessage) => {
        const hasText = Boolean(message.text);
        if (!hasText && message.files.length === 0) {
            return;
        }

        // Convert file attachments to our Attachment format
        const convertedAttachments: Attachment[] = [];
        for (const file of message.files) {
            if (file.url && file.url.startsWith('data:')) {
                const attachment = dataUrlToAttachment(file.url, file.filename);
                if (attachment) {
                    convertedAttachments.push(attachment);
                }
            }
        }

        onSubmit(convertedAttachments.length > 0 ? convertedAttachments : undefined);
    };

    return (
        <div className="p-4 border-t bg-background shrink-0">
            <PromptInput
                onSubmit={handleSubmit}
                accept="image/*"
                multiple
                maxFiles={5}
                maxFileSize={10 * 1024 * 1024} // 10MB
            >
                {/* Attachment Preview - only shown when attachments exist */}
                <AttachmentsHeader />

                <PromptInputBody>
                    <ChatTextarea input={input} onInputChange={onInputChange} />
                </PromptInputBody>
                <PromptInputFooter>
                    <PromptInputTools>
                        <AttachmentButton isStreaming={isStreaming} />
                    </PromptInputTools>
                    <SubmitButton input={input} isStreaming={isStreaming} />
                </PromptInputFooter>
            </PromptInput>
        </div>
    );
}
