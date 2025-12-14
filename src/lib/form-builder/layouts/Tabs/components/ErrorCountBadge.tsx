import React from 'react';

interface ErrorCountBadgeProps {
    count: number;
    className?: string; // Allow optional className override/extension if needed in future
}

export const ErrorCountBadge: React.FC<ErrorCountBadgeProps> = ({ count, className }) => {
    if (!count || count <= 0) return null;

    return (
        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-medium bg-destructive text-white rounded-full">
            {count}
        </span>
    );
};
