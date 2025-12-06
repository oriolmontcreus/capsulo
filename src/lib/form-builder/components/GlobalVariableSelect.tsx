import React, { useEffect, useRef } from 'react';
import {
    Popover,
    PopoverContent,
    PopoverAnchor,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface GlobalVariableSelectProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
    onSelect: (value: string) => void;
    searchQuery: string;
    selectedIndex: number;
    items: string[];
}

export const GlobalVariableSelect: React.FC<GlobalVariableSelectProps> = ({
    open,
    onOpenChange,
    children,
    onSelect,
    searchQuery,
    selectedIndex,
    items
}) => {
    const listRef = useRef<HTMLUListElement>(null);

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
                    {items.length === 0 ? (
                        <div className="py-2 text-center text-sm text-muted-foreground">
                            No variables found.
                        </div>
                    ) : (
                        <ul className="space-y-1" ref={listRef}>
                            {items.map((item, index) => (
                                <li
                                    key={item}
                                    className={cn(
                                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                                        index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                                    )}
                                    // Mouse click selection
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
