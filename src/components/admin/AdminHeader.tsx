import * as React from "react";
import { Button } from "@/components/ui/button";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
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
import SaveButton from "@/components/admin/SaveButton";
import { useRepeaterEdit } from "@/lib/form-builder/context/RepeaterEditContext";
import { useValidation } from "@/lib/form-builder/context/ValidationContext";

interface PageInfo {
    id: string;
    name: string;
    path: string;
}

interface AdminHeaderProps {
    activeView: 'pages' | 'globals' | 'changes';
    selectedPage?: string;
    availablePages?: PageInfo[];
    onSave?: () => Promise<void>;
    hasUnsavedChanges?: boolean;
    triggerSaveRef?: React.RefObject<{ trigger: () => void }>;
    isRightSidebarOpen?: boolean;
    onToggleRightSidebar?: () => void;
}

export function AdminHeader({
    activeView,
    selectedPage,
    availablePages = [],
    onSave,
    hasUnsavedChanges = false,
    triggerSaveRef,
    isRightSidebarOpen = false,
    onToggleRightSidebar
}: AdminHeaderProps) {
    const { editState } = useRepeaterEdit();
    const { totalErrors } = useValidation();

    // Build breadcrumb items
    const buildBreadcrumbs = () => {
        const items: React.ReactNode[] = [];

        // Root level: "Pages", "Global Variables" or "Changes"
        let rootLabel = 'Pages';
        if (activeView === 'globals') rootLabel = 'Global Variables';
        if (activeView === 'changes') rootLabel = 'Changes';

        items.push(
            <BreadcrumbItem key="root" className="hidden md:block">
                <BreadcrumbPage className="text-muted-foreground">
                    {rootLabel}
                </BreadcrumbPage>
            </BreadcrumbItem>
        );

        // Second level: selected page (only for pages view) or when editing
        const shouldShowSecondLevel =
            (activeView === 'pages' && selectedPage) ||
            editState?.isOpen;

        if (shouldShowSecondLevel) {
            items.push(
                <BreadcrumbSeparator key="sep-1" className="hidden md:block">/</BreadcrumbSeparator>
            );

            if (editState?.isOpen) {
                // When editing a repeater item
                const pageName = activeView === 'pages' && selectedPage
                    ? availablePages.find(p => p.id === selectedPage)?.name || selectedPage
                    : 'Global Variables';

                items.push(
                    <BreadcrumbItem key="page">
                        <BreadcrumbPage className="text-muted-foreground">
                            {pageName}
                        </BreadcrumbPage>
                    </BreadcrumbItem>,
                    <BreadcrumbSeparator key="sep-2">/</BreadcrumbSeparator>,
                    <BreadcrumbItem key="field">
                        <BreadcrumbPage className="text-muted-foreground">
                            {editState.field?.label || editState.fieldName}
                        </BreadcrumbPage>
                    </BreadcrumbItem>,
                    <BreadcrumbSeparator key="sep-3">/</BreadcrumbSeparator>,
                    <BreadcrumbItem key="item">
                        <BreadcrumbPage>
                            {editState.itemName} {editState.itemIndex !== undefined ? editState.itemIndex + 1 : ''}
                        </BreadcrumbPage>
                    </BreadcrumbItem>
                );
            } else if (activeView === 'pages' && selectedPage) {
                // Normal page selection
                const pageName = availablePages.find(p => p.id === selectedPage)?.name || selectedPage || 'Home';
                items.push(
                    <BreadcrumbItem key="page">
                        <BreadcrumbPage>
                            {pageName}
                        </BreadcrumbPage>
                    </BreadcrumbItem>
                );
            }
        }

        return items;
    };

    return (
        <header className="bg-background sticky top-0 flex shrink-0 items-center border-b h-[41px] z-10 flex-wrap gap-4">
            <SidebarTrigger className="ml-2" />
            <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb className="flex-1">
                <BreadcrumbList>
                    {buildBreadcrumbs()}
                </BreadcrumbList>
            </Breadcrumb>
            <div className="flex items-center gap-2 ml-auto h-full">
                <Button
                    onClick={onToggleRightSidebar}
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 relative"
                    title={isRightSidebarOpen ? "Close sidebar" : "Open sidebar"}
                >
                    {isRightSidebarOpen ? (
                        <PanelRightClose className="h-4 w-4" />
                    ) : (
                        <PanelRightOpen className="h-4 w-4" />
                    )}
                    {/* Error count badge */}
                    {totalErrors > 0 && !isRightSidebarOpen && (
                        <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 text-[10px] font-medium bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                            {totalErrors > 99 ? '99+' : totalErrors}
                        </span>
                    )}
                </Button>
                <SaveButton
                    onSave={onSave}
                    hasUnsavedChanges={hasUnsavedChanges}
                    triggerSaveRef={triggerSaveRef}
                />
            </div>
        </header>
    );
}

