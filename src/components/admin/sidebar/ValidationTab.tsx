import * as React from "react";
import { ChevronRight, AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ValidationError } from "@/lib/form-builder/context/ValidationContext";

interface ErrorItemProps {
    error: ValidationError;
    onClick: (error: ValidationError) => void;
}

const ErrorItem = React.memo<ErrorItemProps>(({ error, onClick }) => {
    return (
        <button
            onClick={() => onClick(error)}
            type="button"
            className="w-full text-left p-3 rounded-lg border transition-colors bg-input border-input hover:bg-accent/50 cursor-pointer"
        >
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <span className="font-medium">{error.componentName}</span>
                {error.tabName && (
                    <>
                        <ChevronRight className="w-3 h-3" />
                        <span>{error.tabName}</span>
                    </>
                )}
                <ChevronRight className="w-3 h-3" />
                <span>{error.fieldLabel}</span>
            </div>

            <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <span className="text-sm text-destructive">{error.message}</span>
            </div>
        </button>
    );
}, (prev, next) => {
    return (
        prev.error === next.error &&
        prev.onClick === next.onClick
    );
});

interface ValidationTabProps {
    errorList: ValidationError[];
    totalErrors: number;
    currentErrorIndex: number;
    navigateToError: (direction: 'next' | 'prev') => void;
    handleErrorClick: (error: ValidationError) => void;
}

export const ValidationTab: React.FC<ValidationTabProps> = ({
    errorList,
    totalErrors,
    currentErrorIndex,
    navigateToError,
    handleErrorClick,
}) => {
    const errorsByComponent = React.useMemo(() => {
        const grouped: Record<string, ValidationError[]> = {};
        if (totalErrors === 0) return grouped;

        errorList.forEach(error => {
            if (!grouped[error.componentId]) {
                grouped[error.componentId] = [];
            }
            grouped[error.componentId].push(error);
        });
        return grouped;
    }, [errorList, totalErrors]);

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 flex items-center justify-between border-b bg-muted/20 h-[41px]">
                <h3 className="text-sm font-medium truncate text-muted-foreground/80">Validation Errors</h3>
                <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/60">
                    <span>{currentErrorIndex + 1}</span>
                    <span className="opacity-50">/</span>
                    <span>{totalErrors}</span>
                </div>
            </div>

            <div className="px-4 flex items-center justify-between border-b h-[41px]">
                <div className="text-sm font-medium truncate w-full flex items-center">
                    {errorList[currentErrorIndex] && (
                        <div className="flex items-center gap-1">
                            <span className="text-muted-foreground/60 truncate">{errorList[currentErrorIndex].componentName}</span>
                            <ChevronRight size={12} className="text-muted-foreground/40 mt-0.5 shrink-0" />
                            <span className="truncate">{errorList[currentErrorIndex].fieldLabel}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                    <Button
                        onClick={() => navigateToError('prev')}
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        disabled={totalErrors <= 1}
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        onClick={() => navigateToError('next')}
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        disabled={totalErrors <= 1}
                    >
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                    {Object.entries(errorsByComponent).map(([componentId, errors]) => (
                        <div key={componentId} className="space-y-2">
                            <h3 className="text-sm font-medium text-muted-foreground">
                                {errors[0]?.componentName || componentId}
                            </h3>
                            <div className="space-y-2">
                                {errors.map((error) => (
                                    <ErrorItem
                                        key={`${error.componentId}-${error.fieldPath}-${error.message}`}
                                        error={error}
                                        onClick={handleErrorClick}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};
