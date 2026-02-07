import { ImageIcon, RefreshCw, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface AttachmentModeSwitchProps {
  onSwitchMode: () => void;
  onRemoveAttachments: () => void;
}

export function AttachmentModeSwitch({
  onSwitchMode,
  onRemoveAttachments,
}: AttachmentModeSwitchProps) {
  return (
    <Alert className="mb-4 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
      <ImageIcon className="h-4 w-4 text-blue-500" />
      <AlertTitle className="text-blue-700 dark:text-blue-300">
        Attachments require Smart Mode
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-2 text-blue-600 dark:text-blue-400">
        <p>
          Images and attachments need vision capabilities only available in
          Smart Mode.
        </p>
        <div className="mt-2 flex gap-2">
          <Button
            className="gap-2 border-blue-300 hover:bg-blue-100 dark:border-blue-800 dark:hover:bg-blue-900"
            onClick={onSwitchMode}
            size="sm"
            variant="outline"
          >
            <RefreshCw className="h-3 w-3" />
            Switch to Smart Mode
          </Button>
          <Button
            className="gap-2 border-blue-300 hover:bg-blue-100 dark:border-blue-800 dark:hover:bg-blue-900"
            onClick={onRemoveAttachments}
            size="sm"
            variant="outline"
          >
            <X className="h-3 w-3" />
            Remove Attachments
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
