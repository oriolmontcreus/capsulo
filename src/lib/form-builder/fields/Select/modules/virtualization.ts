import React from 'react';
import type { SelectOption } from '../select.types';

/**
 * Virtualization utilities for Select component
 */

export const useVirtualization = (field: any, getAllOptions: () => SelectOption[]) => {
    const [scrollTop, setScrollTop] = React.useState(0);
    const [visibleStartIndex, setVisibleStartIndex] = React.useState(0);
    const [visibleEndIndex, setVisibleEndIndex] = React.useState(0);

    // Virtualization helpers
    const shouldVirtualize = () => {
        if (field.virtualized === false) return false;
        if (field.virtualized === true) return true;

        // Default to virtualization at 50+ items for better performance
        const threshold = field.virtualizeThreshold || 50;
        const totalOptions = getAllOptions().length;
        return totalOptions >= threshold;
    };

    const getItemHeight = () => field.itemHeight || 40;
    const getMaxVisible = () => field.maxVisible || 8;

    // Calculate visible items for true virtualization
    const calculateVisibleRange = React.useCallback((allItems: SelectOption[]) => {
        if (!shouldVirtualize()) {
            return { start: 0, end: allItems.length, items: allItems };
        }

        const itemHeight = getItemHeight();
        const maxVisible = getMaxVisible();
        const containerHeight = maxVisible * itemHeight;

        const start = Math.floor(scrollTop / itemHeight);
        const visibleCount = Math.ceil(containerHeight / itemHeight) + 2; // +2 buffer
        const end = Math.min(start + visibleCount, allItems.length);

        return {
            start: Math.max(0, start),
            end,
            items: allItems.slice(Math.max(0, start), end)
        };
    }, [scrollTop, shouldVirtualize, getItemHeight, getMaxVisible]);

    // Handle virtual scroll
    const handleVirtualScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const newScrollTop = e.currentTarget.scrollTop;
        setScrollTop(newScrollTop);

        const allItems = getAllOptions();
        const { start, end } = calculateVisibleRange(allItems);
        setVisibleStartIndex(start);
        setVisibleEndIndex(end);
    }, [calculateVisibleRange, getAllOptions]);

    return {
        shouldVirtualize,
        getItemHeight,
        getMaxVisible,
        calculateVisibleRange,
        handleVirtualScroll,
        scrollTop,
        visibleStartIndex,
        visibleEndIndex
    };
};