import { AlertCircle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

interface StatusBannerProps {
    cmsError?: Error | null;
    storageError?: string | null;
    isLoadingCMS?: boolean;
    hasPageData?: boolean;
}

export function StatusBanner({ cmsError, storageError, isLoadingCMS, hasPageData }: StatusBannerProps) {
    return (
        <>
            {cmsError && (
                <div className="px-4 py-1.5 bg-destructive/10 border-b border-destructive/20 flex items-center gap-2 text-[10px] text-destructive animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span className="truncate flex-1">CMS Context Error: {cmsError.message}</span>
                </div>
            )}
            {storageError && (
                <div className="px-4 py-1.5 bg-yellow-500/10 border-b border-yellow-500/20 flex items-center gap-2 text-[10px] text-yellow-600 dark:text-yellow-400 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span className="truncate flex-1">{storageError}</span>
                </div>
            )}
            {!cmsError && isLoadingCMS && !hasPageData && (
                 <div className="px-4 py-1.5 bg-muted/30 border-b border-muted/20 flex items-center gap-2 text-[10px] text-muted-foreground animate-in fade-in">
                    <Spinner className="w-3 h-3 shrink-0" />
                    <span className="truncate">Loading site context...</span>
                </div>
            )}
        </>
    );
}
