import React from 'react';
import { cn } from '@/lib/utils';

interface ErrorCountBadgeProps {
    count: number;
    className?: string; // Allow optional className override/extension if needed in future
}

export const ErrorCountBadge: React.FC<ErrorCountBadgeProps> = ({ count, className }) => {
    if (count <= 0) return null;

    return (
        <span className={cn("inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-medium bg-destructive text-white rounded-full", className)}>
            {count}
        </span>
    );
};
