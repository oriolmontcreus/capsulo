import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Component to wrap fields with highlighting support
export const HighlightedFieldWrapper: React.FC<{
    fieldName: string;
    isHighlighted: boolean;
    children: React.ReactNode;
}> = ({ fieldName, isHighlighted, children }) => {
    const fieldRef = React.useRef<HTMLDivElement>(null);
    const [showHighlight, setShowHighlight] = useState(false);
    
    // Scroll to highlighted field and show highlight
    useEffect(() => {
        if (isHighlighted && fieldRef.current) {
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
        } else {
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

