import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

// Component to wrap fields with highlighting support
export const HighlightedFieldWrapper: React.FC<{
    fieldName: string;
    isHighlighted: boolean;
    children: React.ReactNode;
}> = ({ fieldName, isHighlighted, children }) => {
    const fieldRef = React.useRef<HTMLDivElement>(null);
    const [showHighlight, setShowHighlight] = useState(false);
    const prevHighlightedRef = useRef<boolean>(false);
    
    // Scroll to highlighted field and show highlight
    useEffect(() => {
        // Detect transition from false to true (even if value is the same)
        const wasHighlighted = prevHighlightedRef.current;
        prevHighlightedRef.current = isHighlighted;
        
        // Only trigger highlight animation when transitioning from false to true
        if (isHighlighted && !wasHighlighted && fieldRef.current) {
            setShowHighlight(true);
            
            setTimeout(() => {
                fieldRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 100);
            
            // Remove highlight after 500ms
            const timeoutId = setTimeout(() => {
                setShowHighlight(false);
            }, 500);
            
            return () => clearTimeout(timeoutId);
        } else if (!isHighlighted) {
            setShowHighlight(false);
        }
    }, [isHighlighted]);
    
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

