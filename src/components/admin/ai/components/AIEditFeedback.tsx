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
            <Tool className="border-none bg-muted/20 shadow-none mb-0 overflow-visible">
                <ToolHeader 
                    title={`Updated ${componentName}`}
                    type="tool-call"
                    state="output-available"
                    className="hover:bg-muted/40 rounded-xl py-2 px-3 border border-border/40 transition-colors"
                />
                <ToolContent className="px-3 pb-3 pt-1">
                    <div className="flex items-center justify-between gap-4 bg-background/40 backdrop-blur-sm border border-border/30 rounded-lg p-3 group/item hover:border-border/60 transition-all duration-300 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-zinc-950 rounded-lg border border-white/5 flex items-center justify-center shadow-inner group-hover/item:border-white/10 transition-colors">
                                {getStyledSchemaIcon(schema?.icon, <Database className="text-zinc-500" />)}
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-70">
                                        {schemaName || 'CONTENT'}
                                    </span>
                                    <div className="w-1 h-1 rounded-full bg-border" />
                                    <span className="text-[11px] font-medium text-foreground/80">
                                        Changes Saved
                                    </span>
                                </div>
                                {diffStats?.hasChanges && (
                                    <div className="flex items-center gap-2 font-mono text-[10px] mt-0.5">
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
