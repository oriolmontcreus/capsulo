import { useState, useMemo } from "react";
import { Check, Eye } from "lucide-react";
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
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[11px] font-semibold text-green-600 dark:text-green-400 shadow-sm">
                    <Check className="w-3 h-3 stroke-[3px]" />
                    <span>Edited {componentName}</span>
                </div>
                
                {/* GitHub-style diff stats */}
                {diffStats?.hasChanges && (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold">
                        {diffStats.additionsText && (
                            <span className="text-green-600 dark:text-green-400">
                                {diffStats.additionsText}
                            </span>
                        )}
                        {diffStats.deletionsText && (
                            <span className="text-red-500 dark:text-red-400">
                                {diffStats.deletionsText}
                            </span>
                        )}
                    </div>
                )}
                
                {canShowDiff && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px] font-medium flex items-center gap-1.5 hover:bg-muted rounded-full px-3 transition-colors"
                        onClick={() => setIsDiffOpen(true)}
                    >
                        <Eye className="w-3 h-3" />
                        View Diff
                    </Button>
                )}
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
