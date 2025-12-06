import React, { useEffect, useState, useRef } from 'react';
import {
    Popover,
    PopoverContent,
    PopoverAnchor,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Loader2 } from 'lucide-react';

export interface GlobalVariableSelectProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
    onSelect: (value: string) => void;
    searchQuery: string;
    selectedIndex: number;
    items?: string[];
    onItemsCountChange?: (count: number) => void;
}

export const GlobalVariableSelect: React.FC<GlobalVariableSelectProps> = ({
    open,
    onOpenChange,
    children,
    onSelect,
    searchQuery,
    selectedIndex,
    items: externalItems,
    onItemsCountChange
}) => {
    const [internalItems, setInternalItems] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const listRef = useRef<HTMLUListElement>(null);

    // Only fetch if externalItems is NOT provided
    useEffect(() => {
        if (externalItems) return;

        const fetchVariables = async () => {
            setLoading(true);
            try {
                const response = await fetch('/api/cms/globals/load');
                if (response.ok) {
                    const data = await response.json();
                    const globals = data.variables?.find((v: any) => v.id === 'globals');
                    if (globals && globals.data) {
                        setInternalItems(Object.keys(globals.data));
                    }
                }
            } catch (error) {
                console.error('Failed to load global variables', error);
            } finally {
                setLoading(false);
            }
        };

        if (open) {
            fetchVariables();
        }
    }, [open, externalItems]);

    // Use external items if provided, otherwise filter internal items
    const filteredItems = React.useMemo(() => {
        if (externalItems) return externalItems;
        if (!searchQuery) return internalItems;
        return internalItems.filter((item) =>
            item.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [internalItems, searchQuery, externalItems]);

    // Notify parent about count change
    useEffect(() => {
        onItemsCountChange?.(filteredItems.length);
    }, [filteredItems.length, onItemsCountChange]);

    // Scroll active item into view
    useEffect(() => {
        if (open && listRef.current) {
            const activeItem = listRef.current.children[selectedIndex] as HTMLElement;
            if (activeItem) {
                activeItem.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex, open]);

    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverAnchor asChild>{children}</PopoverAnchor>
            <PopoverContent
                className="p-0 w-[250px]"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
            >
                <div className="p-2 border-b text-xs text-muted-foreground bg-muted/30">
                    <span className="font-semibold">Global Variables</span>
                    {searchQuery && <span className="ml-1 opacity-70">- Filtering by "{searchQuery}"</span>}
                </div>
                <div className="max-h-[300px] overflow-y-auto p-1">
                    {loading ? (
                        <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="py-2 text-center text-sm text-muted-foreground">
                            No variables found.
                        </div>
                    ) : (
                        <ul className="space-y-1" ref={listRef}>
                            {filteredItems.map((item, index) => (
                                <li
                                    key={item}
                                    className={cn(
                                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                                        index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                                    )}
                                    // Handle mouse hover to update index via parent? 
                                    // Ideally parent controls index. If we want mouse hover to update selection, we need an `onIndexChange`.
                                    // For now, let's just allow clicking.
                                    onClick={() => onSelect(item)}
                                >
                                    <span className="font-medium mr-2">{item}</span>
                                    <span className="text-xs text-muted-foreground opacity-70">{'{{' + item + '}}'}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};
