import * as React from "react";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { useAuthContext } from "@/components/admin/AuthProvider";
import SaveButton from "@/components/admin/SaveButton";
import TranslationSidebar from "@/components/admin/TranslationSidebar";
import { usePreferences } from "@/hooks/use-preferences";
import { useTranslation } from "@/lib/form-builder/context/TranslationContext";
import { useTranslationData } from "@/lib/form-builder/context/TranslationDataContext";
import { Button } from "@/components/ui/button";
import { PanelRightIcon } from "lucide-react";
import {
    Breadcrumb,
    BreadcrumbItem,
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
import { ScrollArea } from "../ui/scroll-area";

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
    onComponentSelect?: (pageId: string, componentId: string, shouldScroll?: boolean) => void;
    onComponentReorder?: (pageId: string, newComponentIds: string[]) => void;
    onSaveRef?: React.RefObject<{ save: () => Promise<void> }>;
    hasUnsavedChanges?: boolean;
    triggerSaveButtonRef?: React.RefObject<{ trigger: () => void }>;
}

function SidebarWrapperComponent({
    children,
    availablePages = [],
    pagesData = {},
    selectedPage,
    onPageSelect,
    onComponentSelect,
    onComponentReorder,
    onSaveRef,
    hasUnsavedChanges = false,
    triggerSaveButtonRef
}: SidebarWrapperProps) {
    const { user, logout } = useAuthContext();
    const { preferences, isLoaded } = usePreferences();
    const [maxWidth, setMaxWidth] = React.useState(preferences.contentMaxWidth);

    // Translation context for sidebar
    const { isTranslationMode, toggleTranslationMode, activeTranslationField } = useTranslation();

    // Ref to trigger SaveButton's handleSave from keyboard shortcuts
    const triggerSaveRef = React.useRef<{ trigger: () => void }>({ trigger: () => { } });

    // Expose the trigger ref to parent - use the same ref object
    React.useEffect(() => {
        if (triggerSaveButtonRef && triggerSaveButtonRef.current) {
            triggerSaveButtonRef.current = triggerSaveRef.current;
        }
    }, [triggerSaveButtonRef]);

    const {
        currentComponent,
        getFieldValue,
        setTranslationValue
    } = useTranslationData();



    // State for sidebar width and resizing
    const [sidebarWidth, setSidebarWidth] = React.useState(384); // 24rem = 384px
    const [isResizing, setIsResizing] = React.useState(false);

    // Handle resize end
    React.useEffect(() => {
        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Update maxWidth when preferences change
    React.useEffect(() => {
        setMaxWidth(preferences.contentMaxWidth);
    }, [preferences.contentMaxWidth]);

    const handleSave = async () => {
        if (onSaveRef?.current) {
            await onSaveRef.current.save();
        }
    };

    return (
        <div className="flex h-screen">
            {/* Left Sidebar */}
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
                    onComponentReorder={onComponentReorder}
                />

                {/* Main Content Area */}
                <SidebarInset
                    className={`flex flex-col ${!isResizing ? 'transition-all duration-300' : ''}`}
                    style={{
                        marginRight: isTranslationMode && activeTranslationField ? `${sidebarWidth}px` : '0'
                    }}
                >
                    <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b p-4 z-10">
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                            orientation="vertical"
                            className="mr-2 data-[orientation=vertical]:h-4"
                        />
                        <Breadcrumb className="flex-1">
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbPage className="text-muted-foreground">Pages</BreadcrumbPage>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block">/</BreadcrumbSeparator>
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Home</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                        <div className="flex items-center gap-2 ml-auto">
                            <Button
                                onClick={() => {
                                    toggleTranslationMode();
                                }}
                                variant={isTranslationMode ? "default" : "outline"}
                                size="sm"
                                className="flex items-center gap-2"
                                title={isTranslationMode ? "Disable translation mode" : "Enable translation mode"}
                            >
                                <PanelRightIcon className="w-4 h-4" />
                                <span>Translations {isTranslationMode ? '(ON)' : '(OFF)'}</span>
                            </Button>
                            <SaveButton
                                onSave={handleSave}
                                hasUnsavedChanges={hasUnsavedChanges}
                                triggerSaveRef={triggerSaveRef}
                            />
                        </div>
                    </header>
                    <ScrollArea
                        className="flex-1 overflow-hidden p-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border hover:scrollbar-thumb-border/80"
                        data-main-scroll-container="true"
                    >
                        <div
                            key={maxWidth}
                            className="mx-auto transition-all duration-200"
                            style={{
                                maxWidth: isLoaded ? maxWidth : '1400px'
                            }}
                        >
                            {children}
                        </div>
                    </ScrollArea>
                </SidebarInset>
            </SidebarProvider>

            {/* Right Translation Sidebar */}
            <TranslationSidebar
                width={sidebarWidth}
                onWidthChange={setSidebarWidth}
                isResizing={isResizing}
                onResizeStart={() => setIsResizing(true)}
                currentComponentData={currentComponent || undefined}
                onFieldValueChange={setTranslationValue}
                getFieldValue={getFieldValue}
            />
        </div>
    );
}

const SidebarWrapper = React.memo(SidebarWrapperComponent, (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
        prevProps.selectedPage === nextProps.selectedPage &&
        prevProps.hasUnsavedChanges === nextProps.hasUnsavedChanges &&
        prevProps.availablePages === nextProps.availablePages &&
        prevProps.pagesData === nextProps.pagesData &&
        prevProps.onPageSelect === nextProps.onPageSelect &&
        prevProps.onComponentSelect === nextProps.onComponentSelect &&
        prevProps.onComponentReorder === nextProps.onComponentReorder &&
        prevProps.onSaveRef === nextProps.onSaveRef
    );
});
export default SidebarWrapper;