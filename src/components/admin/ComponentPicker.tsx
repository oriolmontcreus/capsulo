"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { getAllSchemas } from "@/lib/form-builder/core/schemaRegistry";
import type { Schema, IconTheme } from "@/lib/form-builder/core/types";
import { cn } from "@/lib/utils";

interface ComponentPickerProps {
    onSelectComponent: (schema: Schema) => void;
    triggerClassName?: string;
    align?: "start" | "center" | "end";
}

// Theme color mappings for icon backgrounds
const iconThemeClasses: Record<IconTheme, string> = {
    gray: "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    blue: "bg-blue-200 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
    green: "bg-green-200 text-green-600 dark:bg-green-950 dark:text-green-400",
    red: "bg-red-200 text-red-600 dark:bg-red-950 dark:text-red-400",
    yellow: "bg-yellow-200 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400",
    purple: "bg-purple-200 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
    pink: "bg-pink-200 text-pink-600 dark:bg-pink-950 dark:text-pink-400",
    indigo: "bg-indigo-200 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400",
    orange: "bg-orange-200 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
};

export function ComponentPicker({
    onSelectComponent,
    triggerClassName,
    align = "start",
}: ComponentPickerProps) {
    const [open, setOpen] = React.useState(false);
    const schemas = getAllSchemas();

    const handleSelect = (schema: Schema) => {
        onSelectComponent(schema);
        setOpen(false);
    };

    // Clone icon with proper styling to inherit color
    const getStyledIcon = (icon: React.ReactNode, theme?: IconTheme) => {
        if (!icon) return <Plus className="h-5 w-5" />;

        // Clone the icon element and ensure it inherits the text color
        if (React.isValidElement(icon)) {
            return React.cloneElement(icon as React.ReactElement<any>, {
                className: "h-5 w-5",
                style: { color: "currentColor" }
            });
        }

        return icon;
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={triggerClassName}
                    aria-label="Add component"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Component
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align={align}>
                <Command>
                    <CommandInput placeholder="Search components..." />
                    <CommandList>
                        <CommandEmpty>No components found.</CommandEmpty>
                            {schemas.map((schema) => (
                                <CommandItem
                                    key={schema.key || schema.name}
                                    value={schema.name}
                                    onSelect={() => handleSelect(schema)}
                                    className="flex items-start gap-3 py-3 cursor-pointer"
                                >
                                    {/* Icon */}
                                    <div className={cn(
                                        "flex-shrink-0 mt-0.5 flex items-center justify-center w-10 h-10 rounded-lg",
                                        schema.iconTheme
                                            ? iconThemeClasses[schema.iconTheme]
                                            : "bg-muted text-muted-foreground"
                                    )}>
                                        {getStyledIcon(schema.icon, schema.iconTheme)}
                                    </div>

                                    {/* Name and Description */}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm">
                                            {schema.name}
                                        </div>
                                        {schema.description && (
                                            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                {schema.description}
                                            </div>
                                        )}
                                    </div>
                                </CommandItem>
                            ))}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
