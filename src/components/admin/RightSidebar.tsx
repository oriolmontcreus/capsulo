import * as React from "react";
import { useTranslation } from "@/lib/form-builder/context/TranslationContext";
import { useValidation, type ValidationError } from "@/lib/form-builder/context/ValidationContext";
import { X, ArrowLeft, ArrowRight } from "lucide-react";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ErrorCountBadge } from "@/lib/form-builder/layouts/Tabs/components/ErrorCountBadge";
import { TranslationsTab } from "./sidebar/TranslationsTab";
import { ValidationTab } from "./sidebar/ValidationTab";
import { AIAgentTab } from "./sidebar/AIAgentTab";

// --- Types ---

interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

interface RightSidebarProps {
    width: number;
    onWidthChange: (width: number) => void;
    isResizing: boolean;
    onResizeStart: () => void;
    onResizeEnd?: () => void;
    // Visibility control props
    isVisible?: boolean;
    onClose?: () => void;
    // Data binding props for Translation Mode
    currentComponentData?: ComponentData;
    onFieldValueChange?: (fieldPath: string, locale: string, value: any, componentId?: string) => void;
    getFieldValue?: (fieldPath: string, locale?: string) => any;
    // Navigation callbacks for error navigation
    onNavigateToPage?: (pageId: string) => void;
    onViewChange?: (view: 'content' | 'globals' | 'changes' | 'history') => void;
}

// --- Main Component ---

function RightSidebarComponent({
    width,
    onWidthChange,
    isResizing,
    onResizeStart,
    onResizeEnd,
    isVisible = false,
    onClose,
    currentComponentData,
    onFieldValueChange,
    getFieldValue,
    onNavigateToPage,
    onViewChange
}: RightSidebarProps) {

    const {
        activeTranslationField,
        closeTranslationSidebar,
        availableLocales,
        defaultLocale,
    } = useTranslation();

    const {
        errorList,
        totalErrors,
        closeErrorSidebar,
        navigateToError,
        goToError,
        currentErrorIndex,
    } = useValidation();

    const isErrorMode = totalErrors > 0;
    const isTranslationModeActive = !!activeTranslationField;

    const [activeTab, setActiveTab] = React.useState<'translations' | 'ai' | 'validation'>('translations');

    // Auto-switch to validation only when errors FIRST appear and we are not on AI tab
    const prevTotalErrors = React.useRef(totalErrors);
    React.useEffect(() => {
        if (totalErrors > 0 && prevTotalErrors.current === 0 && activeTab !== 'ai') {
            setActiveTab('validation');
        }
        prevTotalErrors.current = totalErrors;
    }, [totalErrors, activeTab]);

    // If a translation field is activated and we are not on AI/Validation, switch to translations
    React.useEffect(() => {
        if (activeTranslationField && activeTab === 'validation' && totalErrors === 0) {
            setActiveTab('translations');
        }
    }, [activeTranslationField, activeTab, totalErrors]);



    const pendingDispatchRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);

    React.useEffect(() => {
        return () => {
            pendingDispatchRef.current.forEach(clearTimeout);
        };
    }, []);

    // --- Validation Logic ---

    const handleErrorClick = React.useCallback((error: ValidationError) => {
        // Cancel any pending dispatches from previous clicks
        if (pendingDispatchRef.current) {
            pendingDispatchRef.current.forEach(clearTimeout);
            pendingDispatchRef.current = [];
        }


        if (error.pageId) {
            if (error.pageId === 'globals') {
                onViewChange?.('globals');
            } else {
                onViewChange?.('content');
                onNavigateToPage?.(error.pageId);
            }
        }


        if (error.repeaterFieldName !== undefined && error.repeaterItemIndex !== undefined) {
            const pendingNav = {
                componentId: error.componentId,
                repeaterFieldName: error.repeaterFieldName,
                itemIndex: error.repeaterItemIndex,
                fieldPath: error.fieldPath,
                timestamp: Date.now(),
            };
            sessionStorage.setItem('cms-pending-repeater-nav', JSON.stringify(pendingNav));


            const dispatchEvent = () => {
                window.dispatchEvent(new CustomEvent('cms-open-repeater-item', {
                    detail: pendingNav
                }));
            };

            pendingDispatchRef.current = [
                setTimeout(dispatchEvent, 150),
                setTimeout(dispatchEvent, 400),
                setTimeout(dispatchEvent, 800),
            ];
        }


        goToError(error.componentId, error.fieldPath);
    }, [goToError, onNavigateToPage, onViewChange]);

    // --- Resizing Logic ---

    const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
        onResizeStart();
        e.preventDefault();
    }, [onResizeStart]);

    React.useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = window.innerWidth - e.clientX;
            const constrainedWidth = Math.max(300, Math.min(800, newWidth));
            onWidthChange(constrainedWidth);
        };

        const handleMouseUp = () => {
            if (isResizing && onResizeEnd) {
                onResizeEnd();
            }
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, onWidthChange, onResizeEnd]);

    // --- Keyboard Navigation ---

    React.useEffect(() => {

        if (!isTranslationModeActive && !isErrorMode) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const activeElement = document.activeElement;
            const isInputFocused = activeElement?.tagName === 'INPUT' ||
                activeElement?.tagName === 'TEXTAREA' ||
                (activeElement as HTMLElement)?.contentEditable === 'true';

            if (isInputFocused) return;

            switch (e.key) {
                case 'ArrowLeft':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        if (isErrorMode) navigateToError('prev');
                    }
                    break;
                case 'ArrowRight':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        if (isErrorMode) navigateToError('next');
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isTranslationModeActive, isErrorMode, navigateToError]);


    const handleClose = () => {
        if (isErrorMode) {
            closeErrorSidebar();
        } else if (isTranslationModeActive) {
            closeTranslationSidebar();
        }
        onClose?.();
    };

    // Don't render if sidebar is not visible at all
    if (!isVisible) {
        return null;
    }

    return (
        <div
            className={cn(
                "fixed right-0 top-0 h-full bg-background border-l z-40 flex",
                !isResizing && "transition-all duration-300"
            )}
            style={{ width: `${width}px` }}
        >

            <div
                className="w-px bg-border hover:bg-accent cursor-col-resize shrink-0 transition-colors relative group"
                onMouseDown={handleMouseDown}
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize sidebar"
                tabIndex={0}
            >
                <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-8 bg-sidebar border border-input group-hover:bg-accent rounded-full transition-colors z-50 flex flex-col items-center justify-center gap-1">
                    <div className="w-0.5 h-0.5 bg-muted-foreground/40 rounded-full" />
                    <div className="w-0.5 h-0.5 bg-muted-foreground/40 rounded-full" />
                    <div className="w-0.5 h-0.5 bg-muted-foreground/40 rounded-full" />
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">

                <div className="flex items-center justify-between border-b h-[41px]">
                    <div className="flex items-center">
                        <Button
                            variant={activeTab === 'translations' ? "secondary" : "ghost"}
                            size="sm"
                            className="h-[41px] px-3 text-sm rounded-none"
                            onClick={() => setActiveTab('translations')}
                        >
                            Translations
                        </Button>
                        <Button
                            variant={activeTab === 'ai' ? "secondary" : "ghost"}
                            size="sm"
                            className="h-[41px] px-3 text-sm rounded-none"
                            onClick={() => setActiveTab('ai')}
                        >
                            AI Agent
                        </Button>
                        {totalErrors > 0 && (
                            <Button
                                variant={activeTab === 'validation' ? "secondary" : "ghost"}
                                size="sm"
                                className="h-7 px-3 text-xs gap-1.5"
                                onClick={() => setActiveTab('validation')}
                            >
                                Validation
                                <ErrorCountBadge count={totalErrors} />
                            </Button>
                        )}
                    </div>
                    <Button
                        onClick={handleClose}
                        variant="ghost"
                        size="icon"
                        className="rounded-none h-full"
                    >
                        <X className="size-3.5 text-muted-foreground/60 transition-colors" />
                    </Button>
                </div>


                <div className={cn("flex-1 flex flex-col overflow-hidden", activeTab !== 'ai' && "hidden")}>
                    <AIAgentTab onViewChange={onViewChange} />
                </div>

                <div className={cn("flex-1 flex flex-col overflow-hidden", activeTab !== 'validation' && "hidden")}>
                    <ValidationTab
                        errorList={errorList}
                        totalErrors={totalErrors}
                        currentErrorIndex={currentErrorIndex}
                        navigateToError={navigateToError}
                        handleErrorClick={handleErrorClick}
                    />
                </div>

                <div className={cn("flex-1 flex flex-col overflow-hidden", activeTab !== 'translations' && "hidden")}>
                    <TranslationsTab
                        isTranslationModeActive={isTranslationModeActive}
                        activeTranslationField={activeTranslationField}
                        availableLocales={availableLocales}
                        defaultLocale={defaultLocale}
                        currentComponentData={currentComponentData}
                        getFieldValue={getFieldValue}
                        onFieldValueChange={onFieldValueChange}
                    />
                </div>
            </div>
        </div>
    );
}

const RightSidebar = React.memo(RightSidebarComponent);
export default RightSidebar;
