import React, { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Loader2 } from 'lucide-react';

interface GlobalVariableSelectProps {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (variableKey: string) => void;
    searchQuery?: string;
    className?: string;
}

interface GlobalVariable {
    id: string;
    data: Record<string, any>;
    schemaName: string;
}

export const GlobalVariableSelect: React.FC<GlobalVariableSelectProps> = ({
    children,
    open,
    onOpenChange,
    onSelect,
    searchQuery = '',
    className
}) => {
    const [loading, setLoading] = useState(false);
    const [variables, setVariables] = useState<string[]>([]);

    useEffect(() => {
        if (open) {
            fetchVariables();
        }
    }, [open]);

    const fetchVariables = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/cms/globals/load');
            if (response.ok) {
                const data = await response.json();
                const globals = data.variables?.find((v: GlobalVariable) => v.id === 'globals');
                if (globals && globals.data) {
                    setVariables(Object.keys(globals.data));
                }
            }
        } catch (error) {
            console.error('Failed to load global variables', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverAnchor asChild>
                {children}
            </PopoverAnchor>
            <PopoverContent
                className="p-0 w-[300px]"
                align="start"
                side="bottom"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <Command>
                    <CommandInput placeholder="Search global variable..." value={searchQuery} />
                    <CommandList>
                        <CommandEmpty>No variable found.</CommandEmpty>
                        {loading ? (
                            <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                        ) : (
                            <CommandGroup heading="Global Variables">
                                {variables.map((key) => (
                                    <CommandItem
                                        key={key}
                                        value={key}
                                        onSelect={() => {
                                            onSelect(key);
                                            // The parent should handle closing, but we can also suggest it
                                            // onOpenChange(false); // Let parent handle it via onSelect side effect
                                        }}
                                    >
                                        <span className="font-medium mr-2">{key}</span>
                                        <span className="text-xs text-muted-foreground">{'{{' + key + '}}'}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};
