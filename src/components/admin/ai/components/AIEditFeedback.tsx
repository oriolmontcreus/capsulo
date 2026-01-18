import React, { useState, useMemo } from "react";
import { Eye, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIActionDiffModal } from "./AIActionDiffModal";
import { calculateDiffStats, formatDiffStats } from "../utils/diffStats";
import type { AIAction } from "@/lib/ai/types";
import { DEFAULT_LOCALE } from "@/lib/i18n-utils";
import { Tool, ToolHeader, ToolContent } from "@/components/ai-elements/tool";
import { getSchema } from "@/lib/form-builder/core/schemaRegistry";

import { getStyledSchemaIcon } from "@/lib/form-builder/core/iconUtils";

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

    // Get schema info for the icon
    const schema = useMemo(() => schemaName ? getSchema(schemaName) : null, [schemaName]);

    // Calculate diff stats
    const diffStats = useMemo(() => {
        if (!previousData) return null;
        const stats = calculateDiffStats(previousData, actionData.data, defaultLocale);
        return formatDiffStats(stats);
    }, [previousData, actionData.data, defaultLocale]);

    return (
        <div className="w-full max-w-full group/feedback">
            <Tool className="border-none dark:bg-sidebar bg-sidebar/40 shadow-none mb-0 overflow-visible">
                <ToolHeader 
                    title={`Updated ${componentName}`}
                    type="tool-call"
                    state="output-available"
                    className="rounded-lg py-2 px-3 border border-border/40 transition-colors cursor-pointer bg-secondary"
                />
                <ToolContent className="px-3 pb-3 pt-1">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 size-8 rounded-lg flex items-center justify-center">
                                {getStyledSchemaIcon(schema?.icon, <Database className="text-zinc-500" />)}
                            </div>
                            <div className="flex gap-4 items-center">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm">
                                        {schemaName || 'CONTENT'}
                                    </span>
                                </div>
                                {diffStats?.hasChanges && (
                                    <div className="flex items-center gap-2 text-xs mt-0.5">
                                        {diffStats.additionsText && (
                                            <span className="text-emerald-500">
                                                {diffStats.additionsText}
                                            </span>
                                        )}
                                        {diffStats.deletionsText && (
                                            <span className="text-rose-500">
                                                {diffStats.deletionsText}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {canShowDiff && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2.5 text-[11px] gap-1.5 font-semibold text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md border border-transparent hover:border-border/50 transition-all"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsDiffOpen(true);
                                }}
                            >
                                <Eye className="w-3.5 h-3.5" />
                                Review
                            </Button>
                        )}
                    </div>
                </ToolContent>
            </Tool>

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
        </div>
    );
}
