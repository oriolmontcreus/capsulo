import { useState, useMemo } from "react";
import { FileCode, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIActionDiffModal } from "./AIActionDiffModal";
import { calculateDiffStats, formatDiffStats } from "../utils/diffStats";
import type { AIAction } from "@/lib/ai/types";
import { DEFAULT_LOCALE } from "@/lib/i18n-utils";

interface AIEditFeedbackProps {
    actionData: AIAction;
    previousData?: Record<string, any> | null;
    schemaName?: string | null;
    defaultLocale?: string;
}

export function AIEditFeedback({ 
    actionData, 
    previousData,
    schemaName,
    defaultLocale = DEFAULT_LOCALE
}: AIEditFeedbackProps) {
    const [isDiffOpen, setIsDiffOpen] = useState(false);
    
    const componentName = actionData.componentName || "Component";
    const canShowDiff = !!previousData;

    // Calculate diff stats
    const diffStats = useMemo(() => {
        if (!previousData) return null;
        const stats = calculateDiffStats(previousData, actionData.data, defaultLocale);
        return formatDiffStats(stats);
    }, [previousData, actionData.data, defaultLocale]);

    return (
        <>
            <div className="w-full max-w-[320px] bg-muted/40 border border-border/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-300 group mt-2">
                <div className="flex items-center gap-3 p-3">
                    <div className="flex-shrink-0 w-9 h-9 bg-zinc-950 rounded-lg border border-white/10 flex items-center justify-center shadow-sm group-hover:border-white/20 transition-colors">
                        <FileCode className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-foreground truncate">
                            {componentName}
                        </div>
                        {diffStats?.hasChanges && (
                            <div className="flex items-center gap-1.5 text-[10px] font-mono mt-0.5">
                                {diffStats.additionsText && (
                                    <span className="text-emerald-500 font-bold">
                                        {diffStats.additionsText}
                                    </span>
                                )}
                                {diffStats.deletionsText && (
                                    <span className="text-rose-500 font-bold">
                                        {diffStats.deletionsText}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {canShowDiff && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-background transition-all"
                            onClick={() => setIsDiffOpen(true)}
                            title="View Changes"
                        >
                            <Eye className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            {canShowDiff && (
                <AIActionDiffModal
                    open={isDiffOpen}
                    onOpenChange={setIsDiffOpen}
                    componentName={componentName}
                    schemaName={schemaName}
                    componentId={actionData.componentId}
                    previousData={previousData}
                    newData={actionData.data}
                />
            )}
        </>
    );
}
