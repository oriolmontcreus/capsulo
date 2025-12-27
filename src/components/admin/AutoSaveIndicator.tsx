import * as React from "react";
import { Spinner } from "@/components/ui/spinner";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutoSaveIndicatorProps {
    isDebouncing: boolean;
    className?: string;
}

/**
 * Shows the auto-save status:
 * - Spinner when debouncing/saving to localStorage
 * - Green checkmark when saved
 */
export function AutoSaveIndicator({
    isDebouncing,
    className
}: AutoSaveIndicatorProps) {
    // Track "just saved" state to show checkmark briefly after debounce completes
    const [showSaved, setShowSaved] = React.useState(false);
    const wasDebouncing = React.useRef(false);

    React.useEffect(() => {
        // When debouncing ends, show "saved" indicator
        if (wasDebouncing.current && !isDebouncing) {
            setShowSaved(true);
            const timeout = setTimeout(() => {
                setShowSaved(false);
            }, 2000); // Show checkmark for 2 seconds
            return () => clearTimeout(timeout);
        }
        wasDebouncing.current = isDebouncing;
    }, [isDebouncing]);

    // Don't show anything if not debouncing and not recently saved
    if (!isDebouncing && !showSaved) {
        return null;
    }

    return (
        <div
            className={cn(
                "flex items-center gap-2 px-3 h-full text-sm text-muted-foreground",
                className
            )}
            aria-live="polite"
        >
            {isDebouncing ? (
                <>
                    <Spinner className="w-4 h-4" />
                    <span className="hidden sm:inline">Saving...</span>
                </>
            ) : showSaved ? (
                <>
                    <CheckIcon className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                    <span className="hidden sm:inline text-emerald-500">Saved</span>
                </>
            ) : null}
        </div>
    );
}
