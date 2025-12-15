import * as React from "react";
import { useTranslation } from "@/lib/form-builder/context/TranslationContext";
import { useValidation, type ValidationError } from "@/lib/form-builder/context/ValidationContext";
import { getSchema } from "@/lib/form-builder/core/schemaRegistry";
import { flattenFields } from "@/lib/form-builder/core/fieldHelpers";
import { getFieldComponent } from "@/lib/form-builder/fields/FieldRegistry";
import type { Field } from "@/lib/form-builder/core/types";
import { LanguagesIcon, ArrowLeft, ArrowRight, ChevronRight, X, AlertCircle, Settings2 } from "lucide-react";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ErrorCountBadge } from "@/lib/form-builder/layouts/Tabs/components/ErrorCountBadge";

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
    onFieldValueChange?: (fieldPath: string, locale: string, value: any) => void;
    getFieldValue?: (fieldPath: string, locale?: string) => any;
}

// --- Sub-components ---

// Memoized error item component
const ErrorItem = React.memo<{
    error: ValidationError;
    onClick: () => void;
}>(({ error, onClick }) => {
    return (
        <button
            onClick={onClick}
            type="button"
            className="w-full text-left p-3 rounded-lg border transition-colors bg-background dark:bg-neutral-800 border-border hover:bg-accent/50 hover:border-accent cursor-pointer"
        >
            {/* Breadcrumb path */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <span className="font-medium">{error.componentName}</span>
                {error.tabName && (
                    <>
                        <ChevronRight className="w-3 h-3" />
                        <span>{error.tabName}</span>
                    </>
                )}
                <ChevronRight className="w-3 h-3" />
                <span>{error.fieldLabel}</span>
            </div>
            {/* Error message */}
            <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <span className="text-sm text-destructive">{error.message}</span>
            </div>
        </button>
    );
}, (prev, next) => {
    return (
        prev.error === next.error &&
        prev.onClick === next.onClick
    );
});

// Memoized translation field component
const TranslationField = React.memo<{
    locale: string;
    isDefault: boolean;
    activeTranslationField: string;
    getFieldValue?: (fieldPath: string, locale?: string) => any;
    onFieldValueChange?: (fieldPath: string, locale: string, value: any) => void;
    fieldDefinition: Field | null;
    currentComponentData?: ComponentData;
}>(({ locale, isDefault, activeTranslationField, getFieldValue, onFieldValueChange, fieldDefinition, currentComponentData }) => {
    // Get the field value - recompute when field or locale changes
    const getValueForField = React.useCallback(() => {
        return getFieldValue ? (getFieldValue(activeTranslationField, locale) ?? '') : '';
    }, [getFieldValue, activeTranslationField, locale]);

    // Use local state for responsive UI
    const [localValue, setLocalValue] = React.useState(() => getValueForField());

    // Update local value when the underlying data changes (e.g. from server/context)
    React.useEffect(() => {
        setLocalValue(getValueForField());
    }, [getValueForField]);

    const handleChange = React.useCallback((value: any) => {
        setLocalValue(value); // Update local state immediately for responsive UI
        if (onFieldValueChange && activeTranslationField) {
            onFieldValueChange(activeTranslationField, locale, value);
        }
    }, [onFieldValueChange, activeTranslationField, locale]);

    // Memoize cleanField to prevent new object references on every render
    // Defensive: use (fieldDefinition || {}) to handle undefined/null safely
    const cleanField = React.useMemo(() => {
        const clean = { ...(fieldDefinition || {}) } as Field;
        if (fieldDefinition && 'placeholder' in clean) {
            (clean as any).placeholder = '';
        }
        return clean;
    }, [fieldDefinition]);

    // Memoize empty formData object to maintain stable reference
    const emptyFormData = React.useMemo(() => ({}), []);

    // If no field definition found, show a fallback
    if (!fieldDefinition) {
        return (
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <span className="uppercase font-mono text-sm font-medium">{locale}</span>
                    {isDefault && (
                        <span className="text-sm text-muted-foreground">(default)</span>
                    )}
                </div>
                <div className="text-sm text-muted-foreground">
                    Field definition not found
                </div>
            </div>
        );
    }

    // Get the field component from registry
    const FieldComponent = getFieldComponent(fieldDefinition.type);

    if (!FieldComponent) {
        return (
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <span className="uppercase font-mono text-sm font-medium">{locale}</span>
                    {isDefault && (
                        <span className="text-sm text-muted-foreground">(default)</span>
                    )}
                </div>
                <div className="text-sm text-muted-foreground">
                    No component found for field type: {fieldDefinition.type}
                </div>
            </div>
        );
    }

    return (
        <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
                <span className="uppercase font-mono text-sm font-medium">{locale}</span>
                {isDefault && (
                    <span className="text-sm text-muted-foreground">(default)</span>
                )}
            </div>

            {/* Render the actual field component without label and description */}
            <div className="[&_label]:hidden [&_[data-slot=field-description]]:hidden">
                <FieldComponent
                    field={cleanField}
                    value={localValue}
                    onChange={handleChange}
                    componentData={currentComponentData}
                    formData={emptyFormData}
                    locale={locale}
                />
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.locale === nextProps.locale &&
        prevProps.isDefault === nextProps.isDefault &&
        prevProps.activeTranslationField === nextProps.activeTranslationField &&
        prevProps.getFieldValue === nextProps.getFieldValue &&
        prevProps.onFieldValueChange === nextProps.onFieldValueChange &&
        prevProps.fieldDefinition === nextProps.fieldDefinition &&
        prevProps.currentComponentData === nextProps.currentComponentData
    );
});

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
    getFieldValue
}: RightSidebarProps) {
    // Context hooks
    const {
        activeTranslationField,
        closeTranslationSidebar,
        navigateToField,
        availableLocales,
        defaultLocale,
    } = useTranslation();

    const {
        isErrorSidebarOpen,
        errorList,
        totalErrors,
        closeErrorSidebar,
        navigateToError,
        goToError,
        currentErrorIndex,
    } = useValidation();

    // Determine active mode
    // Error sidebar takes precedence if open
    const isErrorMode = isErrorSidebarOpen && totalErrors > 0;
    // Translation mode is active when there's an active field (no toggle needed)
    const isTranslationModeActive = !isErrorMode && !!activeTranslationField;
    // Default mode: sidebar is visible but no specific content is active
    const isDefaultMode = isVisible && !isErrorMode && !isTranslationModeActive;

    // --- Validation Logic ---

    // Group errors by component
    const errorsByComponent = React.useMemo(() => {
        const grouped: Record<string, ValidationError[]> = {};
        if (!isErrorMode) return grouped;

        errorList.forEach(error => {
            if (!grouped[error.componentId]) {
                grouped[error.componentId] = [];
            }
            grouped[error.componentId].push(error);
        });
        return grouped;
    }, [errorList, isErrorMode]);

    const handleErrorClick = React.useCallback((error: ValidationError) => {
        goToError(error.componentId, error.fieldPath);
    }, [goToError]);

    // --- Translation Logic ---

    // Get field definition for translation
    const getFieldDefinition = React.useCallback((fieldPath: string): Field | null => {
        if (!currentComponentData || !isTranslationModeActive) return null;

        const schema = getSchema(currentComponentData.schemaName);
        if (!schema) return null;

        const segments = fieldPath.split('.');
        let currentFields = flattenFields(schema.fields);
        let foundField: Field | null = null;

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const field = currentFields.find((f: any) => f.name === segment);

            if (field) {
                if (i === segments.length - 1) {
                    foundField = field;
                    break;
                }
                if (field.type === 'repeater' && 'fields' in field) {
                    const nextSegment = segments[i + 1];
                    if (!isNaN(Number(nextSegment))) {
                        i++;
                        currentFields = flattenFields(field.fields);
                        continue;
                    }
                }
            }
            return null;
        }

        return foundField;
    }, [currentComponentData, isTranslationModeActive]);

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
                        else navigateToField('prev');
                    }
                    break;
                case 'ArrowRight':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        if (isErrorMode) navigateToError('next');
                        else navigateToField('next');
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    if (isErrorMode) closeErrorSidebar();
                    else closeTranslationSidebar();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isTranslationModeActive, isErrorMode, navigateToField, navigateToError, closeTranslationSidebar, closeErrorSidebar]);

    // Handle close - closes sidebar and notifies parent
    const handleClose = () => {
        if (isErrorMode) {
            closeErrorSidebar();
        } else if (isTranslationModeActive) {
            closeTranslationSidebar();
        }
        onClose?.();
    };

    // Don't render if sidebar is not visible at all
    if (!isTranslationModeActive && !isErrorMode && !isDefaultMode) {
        return null;
    }

    return (
        <div
            className={cn(
                "fixed right-0 top-0 h-full bg-sidebar border-l z-40 flex",
                !isResizing && "transition-all duration-300"
            )}
            style={{ width: `${width}px` }}
        >
            {/* Resize handle */}
            <div
                className="w-px bg-border hover:bg-accent cursor-col-resize flex-shrink-0 transition-colors relative group"
                onMouseDown={handleMouseDown}
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize sidebar"
                tabIndex={0}
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 bg-border group-hover:bg-accent rounded-full transition-colors" />
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        {isErrorMode ? (
                            <>
                                <h2 className="text-base font-light">VALIDATION ERRORS</h2>
                                <ErrorCountBadge count={totalErrors} />
                            </>
                        ) : isTranslationModeActive ? (
                            <>
                                <LanguagesIcon className="size-5 text-muted-foreground" />
                                <h2 className="text-base font-semibold">Translations</h2>
                            </>
                        ) : (
                            <>
                                <Settings2 className="size-5 text-muted-foreground" />
                                <h2 className="text-base font-semibold">Sidebar</h2>
                            </>
                        )}
                    </div>
                    <Button
                        onClick={handleClose}
                        variant="ghost"
                        size="icon"
                    >
                        <X className="size-4" />
                    </Button>
                </div>

                {/* Sub-header / Navigation - only show for error/translation modes */}
                {(isErrorMode || isTranslationModeActive) && (
                    <div className="px-4 py-3 border-b">
                        {isErrorMode ? (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    {currentErrorIndex + 1} of {totalErrors}
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={() => navigateToError('prev')}
                                        variant="outline"
                                        size="sm"
                                        disabled={totalErrors <= 1}
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-1" />
                                        Previous
                                    </Button>
                                    <Button
                                        onClick={() => navigateToError('next')}
                                        variant="outline"
                                        size="sm"
                                        disabled={totalErrors <= 1}
                                    >
                                        Next
                                        <ArrowRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-medium truncate max-w-[150px]">
                                    {currentComponentData?.schemaName && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-muted-foreground truncate">{currentComponentData.schemaName}</span>
                                            <ChevronRight size={12} className="text-muted-foreground mt-0.5 shrink-0" />
                                            <span className="truncate">
                                                {(() => {
                                                    const field = activeTranslationField ? getFieldDefinition(activeTranslationField) : null;
                                                    return (field && 'label' in field && field.label) || activeTranslationField;
                                                })()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={() => navigateToField('prev')}
                                        variant="outline"
                                        size="sm"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-1" />
                                        Previous
                                    </Button>
                                    <Button
                                        onClick={() => navigateToField('next')}
                                        variant="outline"
                                        size="sm"
                                    >
                                        Next
                                        <ArrowRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Content Area */}
                <ScrollArea className="flex-1">
                    {isErrorMode ? (
                        <div className="p-4 space-y-4">
                            {Object.entries(errorsByComponent).map(([componentId, errors]) => (
                                <div key={componentId} className="space-y-2">
                                    <h3 className="text-sm font-medium text-muted-foreground">
                                        {errors[0]?.componentName || componentId}
                                    </h3>
                                    <div className="space-y-2">
                                        {errors.map((error) => (
                                            <ErrorItem
                                                key={`${error.componentId}-${error.fieldPath}-${error.message}`}
                                                error={error}
                                                onClick={() => handleErrorClick(error)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : isTranslationModeActive ? (
                        <div className="p-4 space-y-4">
                            {availableLocales.map((locale) => (
                                <TranslationField
                                    key={`${activeTranslationField}-${locale}`}
                                    locale={locale}
                                    isDefault={locale === defaultLocale}
                                    activeTranslationField={activeTranslationField || ''}
                                    getFieldValue={getFieldValue}
                                    onFieldValueChange={onFieldValueChange}
                                    fieldDefinition={activeTranslationField ? getFieldDefinition(activeTranslationField) : null}
                                    currentComponentData={currentComponentData}
                                />
                            ))}
                        </div>
                    ) : (
                        /* Default mode - show instructions */
                        <div className="p-6 space-y-6">
                            {/* Translations info */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <LanguagesIcon className="size-5 text-primary" />
                                    <h3 className="text-base font-medium">Translations</h3>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Click on any translatable field to see its translation options here.
                                    Translatable fields are marked with a colored <LanguagesIcon className="size-3 inline-block mx-1 align-middle" /> indicator.
                                </p>
                                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-green-500">●</span>
                                        <span className="text-muted-foreground">All translations complete</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-red-500">●</span>
                                        <span className="text-muted-foreground">Missing translations</span>
                                    </div>
                                </div>
                            </div>

                            {/* Validation section */}
                            {totalErrors > 0 && (
                                <div className="space-y-3 pt-4 border-t">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="size-4 text-destructive" />
                                        <h3 className="text-sm font-medium">Validation Errors</h3>
                                        <ErrorCountBadge count={totalErrors} />
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        There are validation errors that need to be fixed before saving.
                                    </p>
                                    <Button
                                        onClick={() => {
                                            // Navigate to first error
                                            if (errorList.length > 0) {
                                                goToError(errorList[0].componentId, errorList[0].fieldPath);
                                            }
                                        }}
                                        variant="destructive"
                                        size="sm"
                                        className="w-full"
                                    >
                                        View Errors
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>

                {/* Footer with keyboard shortcuts - only show for error/translation modes */}
                {(isErrorMode || isTranslationModeActive) && (
                    <div className="px-4 py-3 border-t text-xs text-muted-foreground space-y-2">
                        <div className="flex items-center gap-2">
                            <KbdGroup>
                                <Kbd>Ctrl</Kbd>
                                <span>+</span>
                                <Kbd><ArrowLeft className="w-3 h-3" /></Kbd>
                                <span>/</span>
                                <Kbd><ArrowRight className="w-3 h-3" /></Kbd>
                            </KbdGroup>
                            <span>Navigate {isErrorMode ? 'errors' : 'fields'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Kbd>Escape</Kbd>
                            <span>Close sidebar</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const RightSidebar = React.memo(RightSidebarComponent);
export default RightSidebar;
