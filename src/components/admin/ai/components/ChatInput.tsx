import { ImageIcon } from "lucide-react";
import * as React from "react";
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
import type { AIMode } from "@/lib/ai/modelConfig";
import type { Attachment } from "@/lib/ai/types";
import { ModeSelector } from "./ModeSelector";

interface ChatInputProps {
  isStreaming: boolean;
  onSubmit: (input: string, attachments?: Attachment[]) => void;
  onCancel?: () => void;
  mode: AIMode;
  onModeChange: (mode: AIMode) => void;
}

function dataUrlToAttachment(
  dataUrl: string,
  filename?: string
): Attachment | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  const mimeType = match[1];
  const data = match[2];

  if (!mimeType.startsWith("image/")) return null;

  return {
    type: "image",
    data,
    mimeType,
    name: filename,
  };
}

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

function SubmitButton({
  input,
  isStreaming,
  onCancel,
}: {
  input: string;
  isStreaming: boolean;
  onCancel?: () => void;
}) {
  const attachments = usePromptInputAttachments();
  const hasAttachments = attachments.files.length > 0;
  const status = isStreaming ? "streaming" : undefined;

  const handleClick = (e: React.MouseEvent) => {
    if (isStreaming && onCancel) {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <PromptInputSubmit
      disabled={isStreaming ? false : !(input.trim() || hasAttachments)}
      onClick={handleClick}
      status={status}
    />
  );
}

function ChatTextarea({
  input,
  onInputChange,
}: {
  input: string;
  onInputChange: (value: string) => void;
}) {
  const attachments = usePromptInputAttachments();

  return (
    <PromptInputTextarea
      className="max-h-[160px] min-h-[80px]"
      onChange={(e) => onInputChange(e.target.value)}
      placeholder={
        attachments.files.length > 0
          ? "Describe what you want to do with this image..."
          : "Ask AI to edit content..."
      }
      value={input}
    />
  );
}

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

export function ChatInput({
  isStreaming,
  onSubmit,
  onCancel,
  mode,
  onModeChange,
}: ChatInputProps) {
  const [input, setInput] = React.useState("");

  const handleSubmit = async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    if (!hasText && message.files.length === 0) {
      return;
    }

    const convertedAttachments: Attachment[] = [];
    for (const file of message.files) {
      if (!file.url) continue;

      let attachment: Attachment | null = null;

      if (file.url.startsWith("data:")) {
        attachment = dataUrlToAttachment(file.url, file.filename);
      } else if (file.url.startsWith("blob:")) {
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
      message.text,
      convertedAttachments.length > 0 ? convertedAttachments : undefined
    );
    setInput("");
  };

  return (
    <div className="shrink-0 border-t bg-background p-4">
      <PromptInput
        accept="image/*"
        maxFileSize={10 * 1024 * 1024}
        maxFiles={5}
        multiple
        onSubmit={handleSubmit}
      >
        <AttachmentsHeader />

        <PromptInputBody>
          <ChatTextarea input={input} onInputChange={setInput} />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <AttachmentButton isStreaming={isStreaming} />
            <ModeSelector
              disabled={isStreaming}
              mode={mode}
              onModeChange={onModeChange}
            />
          </PromptInputTools>
          <SubmitButton
            input={input}
            isStreaming={isStreaming}
            onCancel={onCancel}
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
