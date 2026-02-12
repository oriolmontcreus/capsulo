import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { aiService } from "@/lib/ai/AIService";
import { formatStagedChanges } from "./commitUtils";
import { useRecentCommits } from "./useRecentCommits";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
      <div className="relative">
        <Textarea
          className={`h-24 resize-none pr-8 text-sm ${textareaClassName}`}
          maxLength={72}
          onChange={(e) => onCommitMessageChange(e.target.value)}
          placeholder="Your commit message..."
          value={commitMessage}
        />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Generate commit message"
                className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-primary"
                disabled={isGenerating || isLoadingCommits}
                onClick={handleGenerateWithAI}
                size="icon"
                variant="ghost"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Generate commit message</p>
            </TooltipContent>
          </Tooltip>
        <div
          aria-atomic="true"
          aria-live="polite"
          className="absolute right-2 bottom-2 text-right text-muted-foreground text-xs"
        >
          {commitMessage.length}/72
        </div>
      </div>
      <Button className="w-full font-semibold text-white" onClick={onPublish}>
        Commit changes
      </Button>
    </div>
  );
}
