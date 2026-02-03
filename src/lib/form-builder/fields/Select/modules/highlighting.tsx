import React from 'react';

/**
 * Text highlighting utilities for Select component
 */

export const highlightText = (text: string, query: string, shouldHighlight?: boolean): React.ReactNode => {
    if (!shouldHighlight || !query) return text;

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');

    // Split and filter out empty parts to avoid spacing issues
    const parts = text.split(regex).filter(part => part !== '');

    return (
        <>
            {parts.map((part, index) => {
                if (!part) return null; // Skip empty parts
                return regex.test(part) ? (
                    <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5 py-0">
                        {part}
                    </mark>
                ) : (
                    part
                );
            })}
        </>
    );
};