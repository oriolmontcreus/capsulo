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
import type { Schema } from "@/lib/form-builder/core/types";
import { getStyledSchemaIcon } from "@/lib/form-builder/core/iconUtils";

interface ComponentPickerProps {
    onSelectComponent: (schema: Schema) => void;
    triggerClassName?: string;
    align?: "start" | "center" | "end";
}

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

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    className={triggerClassName}
                    aria-label="Add schema"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add schema
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align={align}>
                <Command>
                    <CommandInput placeholder="Search schemas..." />
                    <CommandList>
                        <CommandEmpty>No schemas found.</CommandEmpty>
                        {schemas.map((schema) => (
                            <CommandItem
                                key={schema.key || schema.name}
                                value={schema.name}
                                onSelect={() => handleSelect(schema)}
                                className="flex items-start gap-3 py-3 cursor-pointer"
                            >
                                {/* Icon */}
                                <div className="flex-shrink-0 mt-0.5 flex items-center justify-center w-10 h-10 rounded-lg bg-muted text-muted-foreground">
                                    {getStyledSchemaIcon(schema.icon, <Plus className="size-5" />, "size-5")}
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
