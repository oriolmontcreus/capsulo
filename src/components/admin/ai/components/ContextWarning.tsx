import { AlertCircle, PlusCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ContextWarningProps {
  percentage: number;
  onSwitchMode: () => void;
  onNewChat: () => void;
}

export function ContextWarning({
  percentage,
  onSwitchMode,
  onNewChat,
}: ContextWarningProps) {
  const displayPercentage = Math.round(percentage * 100);

  return (
    <Alert className="mb-4" variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Context window {displayPercentage}% full</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>
          The conversation is approaching the context limit. You have options:
        </p>
        <div className="mt-2 flex gap-2">
          <Button
            className="gap-2"
            onClick={onSwitchMode}
            size="sm"
            variant="outline"
          >
            <RefreshCw className="h-3 w-3" />
            Switch to Smart Mode
          </Button>
          <Button
            className="gap-2"
            onClick={onNewChat}
            size="sm"
            variant="outline"
          >
            <PlusCircle className="h-3 w-3" />
            Start New Chat
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
