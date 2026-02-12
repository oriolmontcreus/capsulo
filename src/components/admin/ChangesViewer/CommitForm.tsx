import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { aiService } from "@/lib/ai/AIService";
import { formatStagedChanges } from "./commitUtils";
import { useRecentCommits } from "./useRecentCommits";

interface CommitFormProps {
  commitMessage: string;
  onCommitMessageChange: (message: string) => void;
  onPublish: () => void;
  className?: string;
  textareaClassName?: string;
  // New props for AI functionality
  token: string | null;
  pagesWithChanges: Array<{ id: string; name: string }>;
  globalsHasChanges: boolean;
}

export function CommitForm({
  commitMessage,
  onCommitMessageChange,
  onPublish,
  className = "",
  textareaClassName = "",
  token,
  pagesWithChanges,
  globalsHasChanges,
}: CommitFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch recent commits for context
  const { commits: recentCommits, isLoading: isLoadingCommits } =
    useRecentCommits(token, !!token);

  const handleGenerateWithAI = async () => {
    if (!token) {
      return;
    }

    if (pagesWithChanges.length === 0 && !globalsHasChanges) {
      return;
    }

    setIsGenerating(true);

    try {
      // Format staged changes for AI
      const stagedChanges = formatStagedChanges(
        pagesWithChanges,
        globalsHasChanges
      );

      // Generate commit message using AI
      const generatedMessage = await aiService.generateCommitMessage(
        stagedChanges,
        recentCommits
      );

      // Update the commit message state
      onCommitMessageChange(generatedMessage);
    } catch (error) {
      console.error("Failed to generate commit message:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`space-y-4 ${className} relative`}>
      <Textarea
        className={`h-24 resize-none text-sm ${textareaClassName}`}
        maxLength={72}
        onChange={(e) => onCommitMessageChange(e.target.value)}
        placeholder="Your commit message..."
        value={commitMessage}
      />
      <div
        aria-atomic="true"
        aria-live="polite"
        className="absolute right-2 bottom-10 text-right text-muted-foreground text-xs"
      >
        {commitMessage.length}/72
      </div>
      <div className="flex gap-2">
        <Button
          className="flex flex-1 items-center justify-center"
          disabled={isGenerating || isLoadingCommits}
          onClick={handleGenerateWithAI}
          variant="outline"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate with AI
            </>
          )}
        </Button>
        <Button className="flex-1 font-semibold text-white" onClick={onPublish}>
          Commit changes
        </Button>
      </div>
    </div>
  );
}
