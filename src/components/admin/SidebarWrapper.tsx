import * as React from "react";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { useAuthContext } from "@/components/admin/AuthProvider";
import RightSidebar from "@/components/admin/RightSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { usePreferences } from "@/hooks/use-preferences";

import { useValidation } from "@/lib/form-builder/context/ValidationContext";
import { useTranslationData } from "@/lib/form-builder/context/TranslationDataContext";
import {
    SidebarInset,
    SidebarProvider,
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

interface GlobalData {
    variables: ComponentData[];
}

interface SidebarWrapperProps {
    children?: React.ReactNode;
    availablePages?: PageInfo[];
    pagesData?: Record<string, PageData>;
    globalData?: GlobalData;
    selectedPage?: string;
    selectedVariable?: string;
    activeView?: 'content' | 'globals' | 'changes' | 'history';
    commitMessage?: string;
    onCommitMessageChange?: (msg: string) => void;
    onPublish?: () => void;
    globalSearchQuery?: string;
    onGlobalSearchChange?: (query: string) => void;
    highlightedGlobalField?: string;
    onGlobalFieldHighlight?: (fieldKey: string) => void;
    globalFormData?: Record<string, any>;
    onPageSelect?: (pageId: string) => void;
    onComponentSelect?: (pageId: string, componentId: string, shouldScroll?: boolean) => void;
    onComponentReorder?: (pageId: string, newComponentIds: string[]) => void;
    onVariableSelect?: (variableId: string) => void;
    onViewChange?: (view: 'content' | 'globals' | 'changes' | 'history') => void;
    onGlobalDataUpdate?: (newGlobalData: GlobalData) => void;
    isAutoSaving?: boolean;
    selectedCommit?: string | null;
    onCommitSelect?: (sha: string) => void;
}

function SidebarWrapperComponent({
    children,
    availablePages = [],
    pagesData = {},
    globalData = { variables: [] },
    selectedPage,
    selectedVariable,
    activeView = 'content',
    commitMessage,
    onCommitMessageChange,
    onPublish,
    globalSearchQuery,
    onGlobalSearchChange,
    highlightedGlobalField,
    onGlobalFieldHighlight,
    globalFormData,
    onPageSelect,
    onComponentSelect,
    onComponentReorder,
    onVariableSelect,
    onViewChange,
    onGlobalDataUpdate,
    isAutoSaving = false,
    selectedCommit,
    onCommitSelect
}: SidebarWrapperProps) {
    const { user, logout } = useAuthContext();
    const { preferences, isLoaded } = usePreferences();
    const [maxWidth, setMaxWidth] = React.useState(preferences.contentMaxWidth);

    // Translation and Validation context for sidebar
    const { isErrorSidebarOpen, totalErrors } = useValidation();

    const SIDEBAR_STORAGE_KEY = 'capsulo-right-sidebar-visible';
    const [isSidebarVisible, setIsSidebarVisible] = React.useState(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
            if (stored !== null) {
                return stored === 'true';
            }
        }
        return true;
    });

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isSidebarVisible));
        }
    }, [isSidebarVisible]);

    // Toggle sidebar visibility
    const handleToggleSidebar = React.useCallback(() => {
        setIsSidebarVisible(prev => !prev);
    }, []);

    // Close sidebar
    const handleClose = React.useCallback(() => {
        setIsSidebarVisible(false);
    }, []);

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
                    globalData={globalData}
                    selectedPage={selectedPage}
                    selectedVariable={selectedVariable}
                    activeView={activeView}
                    commitMessage={commitMessage}
                    onCommitMessageChange={onCommitMessageChange}
                    onPublish={onPublish}
                    globalSearchQuery={globalSearchQuery}
                    onGlobalSearchChange={onGlobalSearchChange}
                    highlightedGlobalField={highlightedGlobalField}
                    onGlobalFieldHighlight={onGlobalFieldHighlight}
                    globalFormData={globalFormData}
                    onPageSelect={onPageSelect}
                    onComponentSelect={onComponentSelect}
                    onComponentReorder={onComponentReorder}
                    onVariableSelect={onVariableSelect}
                    onViewChange={onViewChange}
                    selectedCommit={selectedCommit}
                    onCommitSelect={onCommitSelect}
                />

                {/* Main Content Area */}
                <SidebarInset
                    className={`flex flex-col ${!isResizing ? 'transition-all duration-300' : ''}`}
                    style={{
                        marginRight: isSidebarVisible ? `${sidebarWidth}px` : '0'
                    }}
                >
                    <AdminHeader
                        activeView={activeView}
                        selectedPage={selectedPage}
                        availablePages={availablePages}
                        isAutoSaving={isAutoSaving}
                        isRightSidebarOpen={isSidebarVisible}
                        onToggleRightSidebar={handleToggleSidebar}
                    />
                    <ScrollArea
                        className="flex-1 overflow-hidden p-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border hover:scrollbar-thumb-border/80 bg-card"
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

            {/* Right Sidebar (Translation & Validation) */}
            <RightSidebar
                width={sidebarWidth}
                onWidthChange={setSidebarWidth}
                isResizing={isResizing}
                onResizeStart={() => setIsResizing(true)}
                currentComponentData={currentComponent || undefined}
                onFieldValueChange={setTranslationValue}
                getFieldValue={getFieldValue}
                isVisible={isSidebarVisible}
                onClose={handleClose}
            />
        </div>
    );
}

const SidebarWrapper = React.memo(SidebarWrapperComponent);
export default SidebarWrapper;