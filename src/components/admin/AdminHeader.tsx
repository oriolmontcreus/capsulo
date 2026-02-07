import * as React from "react";
import { Button } from "@/components/ui/button";
import { PanelRightClose, PanelRightOpen, Eye, Loader2 } from "lucide-react";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { AutoSaveIndicator } from "@/components/admin/AutoSaveIndicator";
import { useRepeaterEdit } from "@/lib/form-builder/context/RepeaterEditContext";
import { useValidation } from "@/lib/form-builder/context/ValidationContext";
import { usePreviewSync } from "@/lib/hooks/usePreviewSync";

interface PageInfo {
    id: string;
    name: string;
    path: string;
}

interface AdminHeaderProps {
    activeView: 'content' | 'globals' | 'changes' | 'history';
    selectedPage?: string;
    availablePages?: PageInfo[];
    isAutoSaving?: boolean;
    isRightSidebarOpen?: boolean;
    onToggleRightSidebar?: () => void;
}

export function AdminHeader({
    activeView,
    selectedPage,
    availablePages = [],
    isAutoSaving = false,
    isRightSidebarOpen = false,
    onToggleRightSidebar
}: AdminHeaderProps) {
    const { editState } = useRepeaterEdit();
    const { totalErrors } = useValidation();
    const { syncAllToPreview, isSyncing } = usePreviewSync();

    const handlePreviewClick = React.useCallback(async () => {
        if (activeView === 'content' && selectedPage) {
            await syncAllToPreview(selectedPage);
        } else if (activeView === 'globals') {
            // For globals view, sync to index page
            await syncAllToPreview('index');
        }
    }, [activeView, selectedPage, syncAllToPreview]);


    const buildBreadcrumbs = () => {
        const items: React.ReactNode[] = [];


        let rootLabel = 'Content';
        if (activeView === 'globals') rootLabel = 'Global Variables';
        if (activeView === 'changes') rootLabel = 'Changes';
        if (activeView === 'history') rootLabel = 'History';

        items.push(
            <BreadcrumbItem key="root" className="hidden md:block shrink-0">
                <BreadcrumbPage className="text-muted-foreground">
                    {rootLabel}
                </BreadcrumbPage>
            </BreadcrumbItem>
        );


        const shouldShowSecondLevel =
            (activeView === 'content' && selectedPage) ||
            editState?.isOpen;

        if (shouldShowSecondLevel) {
            items.push(
                <BreadcrumbSeparator key="sep-1" className="hidden md:block">/</BreadcrumbSeparator>
            );

            if (editState?.isOpen) {

                const pageName = activeView === 'content' && selectedPage
                    ? availablePages.find(p => p.id === selectedPage)?.name || selectedPage
                    : 'Global Variables';

                items.push(
                    <BreadcrumbItem key="page" className="min-w-0">
                        <BreadcrumbPage className="text-muted-foreground truncate max-w-[120px]">
                            {pageName}
                        </BreadcrumbPage>
                    </BreadcrumbItem>,
                    <BreadcrumbSeparator key="sep-2">/</BreadcrumbSeparator>,
                    <BreadcrumbItem key="field" className="min-w-0">
                        <BreadcrumbPage className="text-muted-foreground truncate max-w-[120px]">
                            {editState.field?.label || editState.fieldName}
                        </BreadcrumbPage>
                    </BreadcrumbItem>,
                    <BreadcrumbSeparator key="sep-3">/</BreadcrumbSeparator>,
                    <BreadcrumbItem key="item" className="min-w-0">
                        <BreadcrumbPage className="truncate max-w-[120px]">
                            {editState.itemName} {editState.itemIndex !== undefined ? editState.itemIndex + 1 : ''}
                        </BreadcrumbPage>
                    </BreadcrumbItem>
                );
            } else if (activeView === 'content' && selectedPage) {

                const pageName = availablePages.find(p => p.id === selectedPage)?.name || selectedPage || 'Home';
                items.push(
                    <BreadcrumbItem key="page" className="min-w-0">
                        <BreadcrumbPage className="truncate max-w-[150px]">
                            {pageName}
                        </BreadcrumbPage>
                    </BreadcrumbItem>
                );
            }
        }

        return items;
    };

    const handleSaveComplete = React.useCallback(() => {
        // Always sync automatically on save, but silently (don't force open tab)
        if (activeView === 'content' && selectedPage) {
            syncAllToPreview(selectedPage, true);
        } else if (activeView === 'globals') {
            syncAllToPreview('index', true);
        }
    }, [activeView, selectedPage, syncAllToPreview]);

    return (
        <header className="bg-background sticky top-0 flex shrink-0 items-center border-b h-[41px] z-10 gap-2">
            <SidebarTrigger className="size-[41px] rounded-none" />
            <Separator
                orientation="vertical"
                className="data-[orientation=vertical]:h-4 -ml-2"
            />
            <Breadcrumb className="flex-1 min-w-0 overflow-hidden">
                <BreadcrumbList className="flex-nowrap">
                    {buildBreadcrumbs()}
                </BreadcrumbList>
            </Breadcrumb>
            <div className="flex items-center gap-2 ml-auto h-full">
                <AutoSaveIndicator
                    isDebouncing={isAutoSaving}
                    onSaveComplete={handleSaveComplete}
                />
                {/* Preview Button - visible in content and globals views */}
                <div>
                    {(activeView === 'content' || activeView === 'globals') && (
                        <Button
                            onClick={handlePreviewClick}
                            variant="ghost"
                            size="icon"
                            className="size-[41px] rounded-none"
                            disabled={isSyncing || (activeView === 'content' && !selectedPage)}
                            title="Preview changes in new tab"
                        >
                            {isSyncing ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Eye className="size-4" />
                            )}
                        </Button>
                    )}
                    <Button
                        onClick={onToggleRightSidebar}
                        variant="ghost"
                        size="icon"
                        className="size-[41px] rounded-none relative"
                        title={isRightSidebarOpen ? "Close sidebar" : "Open sidebar"}
                    >
                        {isRightSidebarOpen ? (
                            <PanelRightClose className="size-4" />
                        ) : (
                            <PanelRightOpen className="size-4" />
                        )}

                        {totalErrors > 0 && !isRightSidebarOpen && (
                            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 text-[10px] font-medium bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                                {totalErrors > 99 ? '99+' : totalErrors}
                            </span>
                        )}
                    </Button>
                </div>
            </div>
        </header>
    );
}

