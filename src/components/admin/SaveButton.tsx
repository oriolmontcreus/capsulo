import * as React from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SaveIcon, CheckIcon, AlertCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SaveButtonProps {
    onSave?: () => Promise<void>;
    hasUnsavedChanges?: boolean;
    className?: string;
    size?: "default" | "sm" | "lg" | "icon";
}

export default function SaveButton({
    onSave,
    hasUnsavedChanges = false,
    className,
    size = "sm"
}: SaveButtonProps) {
    const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");

    const handleSave = async () => {
        if (!onSave || !hasUnsavedChanges) return;

        setSaveState("saving");
        try {
            await onSave();
            setSaveState("saved");
            // Show success state for 2 seconds before returning to idle
            setTimeout(() => setSaveState("idle"), 2000);
        } catch (err) {
            console.error("Failed to save: ", err);
            setSaveState("error");
            // Show error state for 3 seconds before returning to idle
            setTimeout(() => setSaveState("idle"), 2000);
        }
    };

    const getButtonContent = () => {
        switch (saveState) {
            case "saving":
                return {
                    icon: <Spinner className="w-4 h-4" />,
                    text: "Saving...",
                    tooltipText: "Saving changes..."
                };
            case "saved":
                return {
                    icon: <CheckIcon className="stroke-emerald-500 w-4 h-4" aria-hidden="true" />,
                    text: "Saved",
                    tooltipText: "Changes saved successfully!"
                };
            case "error":
                return {
                    icon: <AlertCircleIcon className="stroke-destructive w-4 h-4" aria-hidden="true" />,
                    text: "Error",
                    tooltipText: "Failed to save. Please check validation errors."
                };
            default:
                return {
                    icon: <SaveIcon className="w-4 h-4" aria-hidden="true" />,
                    text: "Save changes",
                    tooltipText: hasUnsavedChanges ? "Save your changes" : "No changes to save"
                };
        }
    };

    const { icon, text, tooltipText } = getButtonContent();
    const isDisabled = !hasUnsavedChanges || saveState === "saving";

    return (
        <Button
            onClick={handleSave}
            className={cn("flex items-center gap-2 rounded-full", className)}
            size={size}
            disabled={isDisabled}
            aria-label={text}
            title={tooltipText}
        >
            <div className="w-4 h-4 flex items-center justify-center">
                {icon}
            </div>
            <span>{text}</span>
        </Button>
    );
}