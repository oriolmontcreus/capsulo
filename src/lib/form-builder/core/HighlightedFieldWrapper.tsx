import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

// Component to wrap fields with highlighting support
export const HighlightedFieldWrapper: React.FC<{
    fieldName: string;
    isHighlighted: boolean;
    highlightRequestId?: number;
    children: React.ReactNode;
}> = ({ fieldName, isHighlighted, highlightRequestId, children }) => {
    const fieldRef = React.useRef<HTMLDivElement>(null);
    const [showHighlight, setShowHighlight] = useState(false);
    const prevHighlightedRef = useRef<boolean>(false);
    const prevRequestIdRef = useRef<number | undefined>(undefined);

    // Scroll to highlighted field and show highlight
    useEffect(() => {
        // Detect transition from false to true (even if value is the same)
        const wasHighlighted = prevHighlightedRef.current;
        const prevRequestId = prevRequestIdRef.current;

        prevHighlightedRef.current = isHighlighted;
        prevRequestIdRef.current = highlightRequestId;

        // Trigger if:
        // 1. isHighlighted becomes true (transition)
        // 2. IS highlighted AND requestId changed (forced re-highlight)
        const shouldTrigger = (isHighlighted && !wasHighlighted) ||
            (isHighlighted && highlightRequestId !== undefined && highlightRequestId !== prevRequestId);

        // Only trigger highlight animation when transitioning from false to true OR request ID changed
        if (shouldTrigger && fieldRef.current) {
            setShowHighlight(true);

            const scrollTimeoutId = setTimeout(() => {
                fieldRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 100);

            // Remove highlight after 500ms
            const hideTimeoutId = setTimeout(() => {
                setShowHighlight(false);
            }, 500);

            return () => {
                clearTimeout(scrollTimeoutId);
                clearTimeout(hideTimeoutId);
            };
        } else if (!isHighlighted) {
            setShowHighlight(false);
        }
    }, [isHighlighted, highlightRequestId]);

    return (
        <div
            ref={fieldRef}
            id={`field-${fieldName}`}
            className={cn(
                "transition-all duration-300",
                showHighlight && "bg-accent"
            )}
        >
            {children}
        </div>
    );
};

