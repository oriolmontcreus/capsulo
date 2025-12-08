

import React, { useEffect, useRef } from 'react';
import type { VariableItem } from '../types';

import {
    Popover,
    PopoverContent,
    PopoverAnchor,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ScrollArea } from '@/components/ui/scroll-area';



export interface GlobalVariableSelectProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
    onSelect: (item: VariableItem) => void;
    searchQuery: string;
    selectedIndex: number;
    items: VariableItem[];
    anchorRect?: DOMRect | null;
}

export const GlobalVariableSelect: React.FC<GlobalVariableSelectProps> = ({
    open,
    onOpenChange,
    children,
    onSelect,
    searchQuery,
    selectedIndex,
    items,
    anchorRect
}) => {
    const listRef = useRef<HTMLUListElement>(null);
    const lastAnchorRectRef = useRef<DOMRect | null>(null);

    // Cache the last valid anchorRect to prevent jumping when closing
    if (anchorRect) {
        lastAnchorRectRef.current = anchorRect;
    }
    const effectiveAnchorRect = anchorRect || lastAnchorRectRef.current;

    // Create a virtual ref for the anchor
    const virtualRef = useRef({
        getBoundingClientRect: () => effectiveAnchorRect || new DOMRect(0, 0, 0, 0)
    });

    // Update the virtual ref when effectiveAnchorRect changes
    useEffect(() => {
        if (effectiveAnchorRect) {
            virtualRef.current.getBoundingClientRect = () => effectiveAnchorRect;
        }
    }, [effectiveAnchorRect]);

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
            {effectiveAnchorRect ? children : <PopoverAnchor asChild>{children}</PopoverAnchor>}
            {effectiveAnchorRect && <PopoverAnchor virtualRef={virtualRef} />}
            <PopoverContent
                className="p-0 w-[500px]"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
                // Remove collision detection constraints if needed, or adjust sideOffset
                sideOffset={5}
            >
                <div className="flex h-[300px]">
                    {/* Left Panel: Variable List */}
                    <div className="w-1/2 flex flex-col border-r">
                        <div className="p-2 border-b text-xs text-muted-foreground bg-muted/30">
                            <span className="font-semibold">Global Variables</span>
                            {searchQuery && <span className="ml-1 opacity-70">- Filtering by "{searchQuery}"</span>}
                        </div>
                        <ScrollArea className="flex-1 overflow-y-auto p-1">
                            {items.length === 0 ? (
                                <div className="py-2 text-center text-sm text-muted-foreground">
                                    No variables found.
                                </div>
                            ) : (
                                <ul className="space-y-1" ref={listRef}>
                                    {items.map((item, index) => (
                                        <li
                                            key={item.key}
                                            className={cn(
                                                "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                                                index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                                            )}
                                            // Mouse click selection
                                            onClick={() => onSelect(item)}
                                        >
                                            <div className="flex items-center gap-2 w-full overflow-hidden">
                                                <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                                                    G
                                                </span>
                                                <span className="font-medium truncate">{item.key}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Right Panel: Details */}
                    <div className="w-1/2 flex flex-col bg-muted/10">
                        <div className="p-2 border-b text-xs text-muted-foreground bg-muted/30">
                            <span className="font-semibold">Details</span>
                        </div>
                        {items[selectedIndex] ? (
                            <div className="p-4 space-y-4 overflow-y-auto">
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground mb-1">Value</h4>
                                    <div className="text-sm break-all">
                                        {items[selectedIndex].value || <span className="text-muted-foreground italic">Empty</span>}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground mb-1">Scope</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                                            G
                                        </span>
                                        <span className="text-sm">{items[selectedIndex].scope}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground italic">
                                Select a variable to view details
                            </div>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover >
    );
};
