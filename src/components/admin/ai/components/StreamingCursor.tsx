import { cn } from "@/lib/utils";

interface StreamingCursorProps {
    isActive?: boolean;
    className?: string;
    variant?: "block" | "line";
}

/**
 * A terminal-style blinking cursor that follows streamed AI content.
 * Uses CSS animations defined in global.css for smooth, performant blinking.
 */
export function StreamingCursor({
    isActive = true,
    className,
    variant = "block"
}: StreamingCursorProps) {
    if (!isActive) return null;

    const isBlock = variant === "block";

    return (
        <span
            className={cn(
                "inline-block streaming-cursor",
                isBlock
                    ? "w-[0.55em] h-[1.15em] bg-primary rounded-[2px]"
                    : "w-[2px] h-[1.15em] bg-primary rounded-full",
                className
            )}
            aria-hidden="true"
        />
    );
}
