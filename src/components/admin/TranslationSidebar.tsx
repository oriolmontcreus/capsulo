import * as React from "react";
import { useTranslation } from "@/lib/form-builder/context/TranslationContext";

interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

interface TranslationSidebarProps {
    width: number;
    onWidthChange: (width: number) => void;
    isResizing: boolean;
    onResizeStart: () => void;
    // Data binding props
    currentComponentData?: ComponentData;
    onFieldValueChange?: (fieldPath: string, locale: string, value: any) => void;
    getFieldValue?: (fieldPath: string, locale?: string) => any;
}

export default function TranslationSidebar({
    width,
    onWidthChange,
    isResizing,
    onResizeStart,
    currentComponentData,
    onFieldValueChange,
    getFieldValue
}: TranslationSidebarProps) {
    const {
        isTranslationMode,
        activeTranslationField,
        closeTranslationSidebar,
        navigateToField,
        availableLocales,
        defaultLocale,
    } = useTranslation();

    // Get field information from current page data
    const getFieldInfo = React.useCallback((fieldPath: string) => {
        // For now, we'll determine field type from the field name
        // In a full implementation, this would come from the schema
        if (fieldPath.includes('subtitle') || fieldPath.includes('description')) {
            return { type: 'textarea', label: fieldPath };
        }
        return { type: 'input', label: fieldPath };
    }, []);

    // Handle sidebar resizing
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
            // This will be handled by the parent component
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, onWidthChange]);

    // Keyboard navigation
    React.useEffect(() => {
        if (!isTranslationMode) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Only handle shortcuts when no input is focused
            const activeElement = document.activeElement;
            const isInputFocused = activeElement?.tagName === 'INPUT' ||
                activeElement?.tagName === 'TEXTAREA' ||
                (activeElement as HTMLElement)?.contentEditable === 'true';

            if (isInputFocused) return;

            switch (e.key) {
                case 'ArrowUp':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        navigateToField('prev');
                    }
                    break;
                case 'ArrowDown':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        navigateToField('next');
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    closeTranslationSidebar();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isTranslationMode, navigateToField, closeTranslationSidebar]);

    if (!isTranslationMode || !activeTranslationField) {
        return null;
    }

    return (
        <div
            className={`fixed right-0 top-0 h-full bg-background border-l border-border z-40 flex ${!isResizing ? 'transition-all duration-300' : ''}`}
            style={{ width: `${width}px` }}
        >
            {/* Resize handle */}
            <div
                className="w-1 bg-border hover:bg-accent cursor-col-resize flex-shrink-0 transition-colors"
                onMouseDown={handleMouseDown}
                style={{ cursor: isResizing ? 'col-resize' : 'col-resize' }}
            />

            <div className="flex-1 flex flex-col">
                {/* Sidebar header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <div className="h-5 w-5 text-primary">🌐</div>
                        <h2 className="text-lg font-semibold">Translations</h2>
                    </div>
                    <button
                        onClick={closeTranslationSidebar}
                        className="h-8 w-8 p-0 rounded-md hover:bg-accent flex items-center justify-center"
                    >
                        ✕
                    </button>
                </div>

                {/* Field context */}
                <div className="p-4 border-b border-border">
                    <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">
                            Translating field:
                        </div>
                        <div className="font-medium text-sm">
                            {activeTranslationField}
                        </div>
                        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                            {getFieldInfo(activeTranslationField).type}
                        </div>
                    </div>
                </div>

                {/* Field navigation */}
                <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                            Navigate fields:
                        </span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => navigateToField('prev')}
                                className="h-8 w-8 p-0 rounded-md border hover:bg-accent flex items-center justify-center"
                            >
                                ←
                            </button>
                            <button
                                onClick={() => navigateToField('next')}
                                className="h-8 w-8 p-0 rounded-md border hover:bg-accent flex items-center justify-center"
                            >
                                →
                            </button>
                        </div>
                    </div>
                </div>

                {/* Translation inputs */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-4">
                        {availableLocales.map((locale) => {
                            const isDefault = locale === defaultLocale;
                            const fieldInfo = getFieldInfo(activeTranslationField);

                            return (
                                <div key={locale} className={`rounded-lg border p-4 ${isDefault ? 'border-primary/50' : ''}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="uppercase font-mono text-sm">
                                                {locale}
                                            </span>
                                            {isDefault && (
                                                <div className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                                                    Default
                                                </div>
                                            )}
                                        </div>
                                        <div className="w-2 h-2 rounded-full bg-red-500" title="Translation missing" />
                                    </div>

                                    {/* Render appropriate field type */}
                                    {fieldInfo.type === 'textarea' ? (
                                        <textarea
                                            placeholder={`Enter ${activeTranslationField} in ${locale.toUpperCase()}`}
                                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-vertical"
                                            rows={3}
                                            value={getFieldValue ? getFieldValue(activeTranslationField, locale) || '' : ''}
                                            onChange={(e) => {

                                                if (onFieldValueChange && activeTranslationField) {
                                                    onFieldValueChange(activeTranslationField, locale, e.target.value);
                                                }
                                            }}
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            placeholder={`Enter ${activeTranslationField} in ${locale.toUpperCase()}`}
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={getFieldValue ? getFieldValue(activeTranslationField, locale) || '' : ''}
                                            onChange={(e) => {

                                                if (onFieldValueChange && activeTranslationField) {
                                                    onFieldValueChange(activeTranslationField, locale, e.target.value);
                                                }
                                            }}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border">
                    <div className="text-xs text-muted-foreground space-y-1">
                        <div>Keyboard shortcuts:</div>
                        <div>• Ctrl+↑/↓: Navigate fields</div>
                        <div>• Escape: Close sidebar</div>
                    </div>
                </div>
            </div>
        </div>
    );
}