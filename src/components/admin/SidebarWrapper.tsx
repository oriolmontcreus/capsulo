import * as React from "react";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { useAuthContext } from "@/components/admin/AuthProvider";
import SaveButton from "@/components/admin/SaveButton";
import { usePreferences } from "@/hooks/use-preferences";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";

interface PageInfo {
    id: string;
    name: string;
    path: string;
}

interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

interface PageData {
    components: ComponentData[];
}

interface SidebarWrapperProps {
    children?: React.ReactNode;
    availablePages?: PageInfo[];
    pagesData?: Record<string, PageData>;
    selectedPage?: string;
    onPageSelect?: (pageId: string) => void;
    onComponentSelect?: (pageId: string, componentId: string) => void;
    onSaveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
    hasUnsavedChanges?: boolean;
}

export default function SidebarWrapper({
    children,
    availablePages = [],
    pagesData = {},
    selectedPage,
    onPageSelect,
    onComponentSelect,
    onSaveRef,
    hasUnsavedChanges = false
}: SidebarWrapperProps) {
    const { user, logout } = useAuthContext();
    const { preferences, isLoaded } = usePreferences();
    const [maxWidth, setMaxWidth] = React.useState(preferences.contentMaxWidth);

    // Update maxWidth when preferences change
    React.useEffect(() => {
        setMaxWidth(preferences.contentMaxWidth);
    }, [preferences.contentMaxWidth]);

    const handleSave = async () => {
        if (onSaveRef?.current) {
            await onSaveRef.current();
        }
    };

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "350px",
                } as React.CSSProperties
            }
        >
            <AppSidebar
                user={user || undefined}
                onLogout={logout}
                availablePages={availablePages}
                pagesData={pagesData}
                selectedPage={selectedPage}
                onPageSelect={onPageSelect}
                onComponentSelect={onComponentSelect}
            />
            <SidebarInset className="flex flex-col">
                <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b p-4 z-10">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                        orientation="vertical"
                        className="mr-2 data-[orientation=vertical]:h-4"
                    />
                    <Breadcrumb className="flex-1">
                        <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Home</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                    <SaveButton
                        onSave={handleSave}
                        hasUnsavedChanges={hasUnsavedChanges}
                        className="ml-auto"
                    />
                </header>
                <div className="flex-1 overflow-auto p-4">
                    <div
                        key={maxWidth}
                        className="mx-auto transition-all duration-200"
                        style={{
                            maxWidth: isLoaded ? maxWidth : '1400px'
                        }}
                    >
                        {children}
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}