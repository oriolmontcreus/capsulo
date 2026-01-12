import { useState } from "react";
import { Check, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIActionDiffModal } from "./AIActionDiffModal";
import type { AIAction } from "@/lib/ai/types";

interface AIEditFeedbackProps {
    actionData: AIAction;
    previousData?: Record<string, any> | null;
    schemaName?: string | null;
}

export function AIEditFeedback({ 
    actionData, 
    previousData,
    schemaName
}: AIEditFeedbackProps) {
    const [isDiffOpen, setIsDiffOpen] = useState(false);
    
    const componentName = actionData.componentName || "Component";
    const canShowDiff = !!previousData;

    return (
        <>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[11px] font-semibold text-green-600 dark:text-green-400 shadow-sm">
                    <Check className="w-3 h-3 stroke-[3px]" />
                    <span>Edited {componentName}</span>
                </div>
                
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
