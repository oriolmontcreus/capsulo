import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { DiffView } from "../../ChangesViewer/DiffView";
import type { PageData } from "@/lib/form-builder";
import { isTranslationObject, DEFAULT_LOCALE } from "@/lib/i18n-utils";

interface AIActionDiffModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    componentName: string;
    schemaName?: string | null;
    componentId: string;
    previousData: Record<string, any>;
    newData: Record<string, any>;
}

export function AIActionDiffModal({
    open,
    onOpenChange,
    componentName,
    schemaName,
    componentId,
    previousData,
    newData
}: AIActionDiffModalProps) {
    
    // Construct ephemeral PageData objects for DiffView
    
    // 1. Create a deep clone of previousData to serve as the base for new data
    const mergedNewData = structuredClone(previousData);

    // 2. Merge the AI's changes (newData) into this base
    // Note: newData comes from sanitizeActionData which returns simple { field: value }
    // We need to wrap it in { value: ... } to match CMS structure
    Object.entries(newData).forEach(([key, value]) => {
        if (!mergedNewData[key]) {
            mergedNewData[key] = {};
        }
        
        const existingValue = mergedNewData[key].value;
        
        // If the existing value is a translation object, we must update inside it
        // rather than replacing it with a flat string.
        // Since the AI currently returns flat strings (sanitized), we assume it's editing the default locale.
        if (isTranslationObject(existingValue)) {
            mergedNewData[key].value = {
                ...existingValue,
                [DEFAULT_LOCALE]: value
            };
        } else {
            mergedNewData[key].value = value;
        }
    });

    const oldPageData: PageData = {
        components: [{
            id: componentId,
            schemaName: schemaName || 'Unknown', 
            data: previousData
        }]
    };

    const newPageData: PageData = {
        components: [{
            id: componentId,
            schemaName: schemaName || 'Unknown',
            data: mergedNewData
        }]
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader className="pb-4 border-b shrink-0">
                    <DialogTitle>Changes to {componentName}</DialogTitle>
                    <DialogDescription>
                        Review the changes applied by the AI.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-auto py-6 pr-2">
                    <DiffView 
                        oldPageData={oldPageData}
                        newPageData={newPageData}
                        hideHeader={true}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
