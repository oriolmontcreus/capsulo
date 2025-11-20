import * as React from "react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface ConfirmPopoverProps {
    children: React.ReactNode;
    onConfirm: () => void;
    title?: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
}

export function ConfirmPopover({
    children,
    onConfirm,
    title = "Are you sure?",
    description = "This action cannot be undone.",
    confirmText = "Continue",
    cancelText = "Cancel",
    side = "top",
    align = "center",
}: ConfirmPopoverProps) {
    const [open, setOpen] = React.useState(false);

    const handleConfirm = () => {
        onConfirm();
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent
                side={side}
                align={align}
                className="w-80"
                onInteractOutside={(e) => {
                    e.preventDefault();
                }}
            >
                <div className="space-y-3">
                    <div className="space-y-1">
                        <h4 className="font-medium leading-none">{title}</h4>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOpen(false)}
                        >
                            {cancelText}
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleConfirm}
                        >
                            {confirmText}
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
