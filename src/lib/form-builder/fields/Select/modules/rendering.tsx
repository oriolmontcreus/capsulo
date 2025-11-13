import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    CommandItem,
    CommandGroup,
} from '@/components/ui/command';
import {
    SelectGroup,
    SelectItem,
    SelectLabel,
} from '@/components/ui/select';
import type { SelectOption, SelectField } from '../select.types';
import { highlightText } from './highlighting';
import { AVAILABLE_PAGES } from '../pages';

/**
 * Rendering utilities for Select component options
 */

interface RenderingProps {
    field: SelectField;
    value: any;
    onChange: (value: any) => void;
    setOpen: (open: boolean) => void;
    debouncedSearchQuery: string;
    hasMultipleColumns: () => boolean;
    shouldVirtualize: () => boolean;
    getItemHeight: () => number;
    calculateVisibleRange: (items: SelectOption[]) => { start: number; end: number; items: SelectOption[] };
    selectId: string;
    getBaseGridStyles: () => React.CSSProperties;
}

export const useRendering = (props: RenderingProps) => {
    const {
        field,
        value,
        onChange,
        setOpen,
        debouncedSearchQuery,
        hasMultipleColumns,
        shouldVirtualize,
        getItemHeight,
        calculateVisibleRange,
        selectId,
        getBaseGridStyles
    } = props;

    const internalLinksGroups = React.useMemo(() => {
        if (!field.internalLinks || !field.groupBySection) {
            return null;
        }

        const groups: Record<string, SelectOption[]> = {
            'Root': [],
        };

        for (const page of AVAILABLE_PAGES) {
            const pathSegments = page.value.split('/').filter(Boolean);

            if (pathSegments.length <= 1) {
                groups['Root'].push(page);
                continue;
            }

            const topLevel = pathSegments[0];
            const groupName = topLevel.charAt(0).toUpperCase() + topLevel.slice(1).replace(/[-_]/g, ' ');

            if (!groups[groupName]) {
                groups[groupName] = [];
            }

            groups[groupName].push(page);
        }

        // Remove empty Root group if it exists
        if (groups['Root'].length === 0) {
            delete groups['Root'];
        }

        return Object.entries(groups).map(([label, options]) => ({
            label,
            options,
        }));
    }, [field.internalLinks, field.groupBySection]);

    // Memoize flattened options to avoid repeated flatMap operations
    const allOptions = React.useMemo(() => {
        if (field.internalLinks) {
            return AVAILABLE_PAGES;
        }
        
        if (field.groups && field.groups.length > 0) {
            return field.groups.flatMap(group => group.options);
        }
        
        return field.options;
    }, [field.internalLinks, field.groups, field.options]);

    // Determine which groups to use (internal links groups or user-defined groups)
    const activeGroups = React.useMemo(() => {
        if (field.internalLinks && field.groupBySection && internalLinksGroups) {
            return internalLinksGroups;
        }
        return field.groups;
    }, [field.internalLinks, field.groupBySection, internalLinksGroups, field.groups]);

    // Helper to render option content with prefix/suffix/description
    const renderOptionContent = (opt: any) => {
        const hasOptPrefix = !!opt.prefix;
        const hasOptSuffix = !!opt.suffix;
        const hasDescription = !!opt.description;
        const hasOptAddon = hasOptPrefix || hasOptSuffix;

        if (!hasOptAddon && !hasDescription) return opt.label;

        return (
            <div className="flex items-center gap-2 w-full">
                {hasOptPrefix && (
                    <span className="flex shrink-0 items-center">
                        {opt.prefix}
                    </span>
                )}
                <span className="flex-1 min-w-0">
                    <div className="flex flex-col">
                        <span>{opt.label}</span>
                        {hasDescription && (
                            <span className="text-xs text-muted-foreground truncate">
                                {opt.description}
                            </span>
                        )}
                    </div>
                </span>
                {hasOptSuffix && (
                    <span className="flex shrink-0 items-center">
                        {opt.suffix}
                    </span>
                )}
            </div>
        );
    };    // Helper to get all options (from both individual options and groups)
    const getAllOptions = () => {
        return allOptions;
    };

    // Helper to check if using groups
    const hasGroups = () => {
        return activeGroups && activeGroups.length > 0;
    };

    // Helper to render a single command item
    const renderSingleCommandItem = (opt: SelectOption, virtualIndex?: number) => {
        const queryToUse = field.minSearchLength && debouncedSearchQuery.length < field.minSearchLength ? '' : debouncedSearchQuery;
        const optionContent = field.highlightMatches ? {
            ...opt,
            label: highlightText(opt.label, queryToUse, field.highlightMatches)
        } : opt;

        return (
            <CommandItem
                key={`${opt.value}-${virtualIndex || 0}`}
                value={opt.label}
                disabled={opt.disabled}
                onSelect={() => {
                    onChange(value === opt.value ? '' : opt.value);
                    setOpen(false);
                }}
                className={cn(
                    hasMultipleColumns() ? "justify-between" : "",
                    shouldVirtualize() && "min-h-[40px] flex items-center"
                )}
                style={shouldVirtualize() ? { height: getItemHeight() } : undefined}
            >
                {hasMultipleColumns() ? (
                    <>
                        <span className="truncate">{renderOptionContent(optionContent)}</span>
                        <Check
                            className={cn(
                                "h-4 w-4 shrink-0",
                                value === opt.value ? "opacity-100" : "opacity-0"
                            )}
                        />
                    </>
                ) : (
                    <>
                        {renderOptionContent(optionContent)}
                        <Check
                            className={cn(
                                "ml-auto h-4 w-4",
                                value === opt.value ? "opacity-100" : "opacity-0"
                            )}
                        />
                    </>
                )}
            </CommandItem>
        );
    };

    // Helper to render command items with true virtualization
    const renderCommandItems = (searchInOption: (option: SelectOption, query: string) => boolean) => {
        const queryToUse = field.minSearchLength && debouncedSearchQuery.length < field.minSearchLength ? '' : debouncedSearchQuery;

        // If using groups, render with CommandGroup components
        if (hasGroups()) {
            return activeGroups!.map((group) => {
                const filteredOptions = group.options.filter(opt => searchInOption(opt, queryToUse));
                if (filteredOptions.length === 0) return null;

                return (
                    <CommandGroup key={group.label} heading={group.label}>
                        {filteredOptions.map((opt) => renderSingleCommandItem(opt))}
                    </CommandGroup>
                );
            });
        }

        // Otherwise use flat rendering with optional virtualization
        const filteredOptions = allOptions.filter(opt => searchInOption(opt, queryToUse));

        // If not virtualizing, render all filtered options normally
        if (!shouldVirtualize()) {
            return filteredOptions.map((opt) => renderSingleCommandItem(opt));
        }

        // True virtualization: only render visible items
        const { start, end, items: visibleItems } = calculateVisibleRange(filteredOptions);
        const itemHeight = getItemHeight();
        const totalHeight = filteredOptions.length * itemHeight;
        const offsetY = start * itemHeight;

        return (
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                    {visibleItems.map((opt, index) => renderSingleCommandItem(opt, start + index))}
                </div>
            </div>
        );
    };

    // Helper to render select items (for regular select)
    const renderSelectItems = () => {
        if (hasGroups()) {
            return activeGroups!.map((group) => (
                <SelectGroup key={group.label}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.options.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                            {renderOptionContent(opt)}
                        </SelectItem>
                    ))}
                </SelectGroup>
            ));
        } else {
            return field.options.map(opt => (
                <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {renderOptionContent(opt)}
                </SelectItem>
            ));
        }
    };

    return {
        renderOptionContent,
        getAllOptions,
        hasGroups,
        renderSingleCommandItem,
        renderCommandItems,
        renderSelectItems
    };
};