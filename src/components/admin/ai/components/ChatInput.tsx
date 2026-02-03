import { ImageIcon } from "lucide-react";
import {
  PromptInput,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Attachment } from "@/lib/ai/types";

interface ChatInputProps {
  input: string;
  isStreaming: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (attachments?: Attachment[]) => void;
}

/**
 * Convert a data URL to our Attachment format
 */
function dataUrlToAttachment(
  dataUrl: string,
  filename?: string
): Attachment | null {
  // Parse data URL: data:image/jpeg;base64,/9j/...
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  const mimeType = match[1];
  const data = match[2];

  // Only support images for now
  if (!mimeType.startsWith("image/")) return null;

  return {
    type: "image",
    data, // Just the base64 part, without prefix
    mimeType,
    name: filename,
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
            disabled={isStreaming}
            onClick={() => attachments.openFileDialog()}
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
        {(file) => <PromptInputAttachment data={file} key={file.id} />}
      </PromptInputAttachments>
    </PromptInputHeader>
  );
}

// Submit button wrapper that checks for attachments - MUST be inside PromptInput
function SubmitButton({
  input,
  isStreaming,
}: {
  input: string;
  isStreaming: boolean;
}) {
  const attachments = usePromptInputAttachments();
  const hasAttachments = attachments.files.length > 0;
  const status = isStreaming ? "streaming" : undefined;

  return (
    <PromptInputSubmit
      disabled={!(input.trim() || hasAttachments) || isStreaming}
      status={status}
    />
  );
}

// Dynamic placeholder based on attachments - MUST be inside PromptInput
function ChatTextarea({
  input,
  onInputChange,
}: {
  input: string;
  onInputChange: (value: string) => void;
}) {
  const attachments = usePromptInputAttachments();
  const hasAttachments = attachments.files.length > 0;

  return (
    <PromptInputTextarea
      className="max-h-[160px] min-h-[80px]"
      onChange={(e) => onInputChange(e.target.value)}
      placeholder={
        hasAttachments
          ? "Describe what you want to do with this image..."
          : "Ask AI to edit content..."
      }
      value={input}
    />
  );
}

export function ChatInput({
  input,
  isStreaming,
  onInputChange,
  onSubmit,
}: ChatInputProps) {
  const handleSubmit = async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    if (!hasText && message.files.length === 0) {
      return;
    }

    // Convert file attachments to our Attachment format
    const convertedAttachments: Attachment[] = [];
    for (const file of message.files) {
      if (!file.url) continue;

      let attachment: Attachment | null = null;

      if (file.url.startsWith("data:")) {
        // Data URL - parse directly
        attachment = dataUrlToAttachment(file.url, file.filename);
      } else if (file.url.startsWith("blob:")) {
        // Blob URL - fetch and convert to base64
        try {
          const response = await fetch(file.url);
          const blob = await response.blob();
          const base64 = await blobToBase64(blob);
          const mimeType = blob.type || "image/jpeg";

          if (mimeType.startsWith("image/")) {
            attachment = {
              type: "image",
              data: base64,
              mimeType,
              name: file.filename,
            };
          }
        } catch (err) {
          console.error("Failed to convert blob to attachment:", err);
        }
      }

      if (attachment) {
        convertedAttachments.push(attachment);
      }
    }

    onSubmit(
      convertedAttachments.length > 0 ? convertedAttachments : undefined
    );
  };

  // Helper to convert Blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string)?.split(",")[1];
        if (base64) resolve(base64);
        else reject(new Error("Failed to read blob"));
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  return (
    <div className="shrink-0 border-t bg-background p-4">
      <PromptInput
        accept="image/*"
        maxFileSize={10 * 1024 * 1024}
        maxFiles={5}
        multiple
        onSubmit={handleSubmit} // 10MB
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
