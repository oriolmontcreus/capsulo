import * as React from "react";
import { useTranslation } from "@/lib/form-builder/context/TranslationContext";
import { getSchema } from "@/lib/form-builder/core/schemaRegistry";
import { flattenFields } from "@/lib/form-builder/core/fieldHelpers";
import { getFieldComponent } from "@/lib/form-builder/fields/FieldRegistry";
import type { Field } from "@/lib/form-builder/core/types";
import { LanguagesIcon, ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";

// Memoized translation field component to prevent unnecessary re-renders
const TranslationField = React.memo<{
    locale: string;
    isDefault: boolean;
    activeTranslationField: string;
    getFieldValue?: (fieldPath: string, locale?: string) => any;
    onFieldValueChange?: (fieldPath: string, locale: string, value: any) => void;
    fieldDefinition: Field | null;
    currentComponentData?: ComponentData;
}>(({ locale, isDefault, activeTranslationField, getFieldValue, onFieldValueChange, fieldDefinition, currentComponentData }) => {
    // Use local state to avoid excessive getFieldValue calls
    const [localValue, setLocalValue] = React.useState(() =>
        getFieldValue ? (getFieldValue(activeTranslationField, locale) ?? '') : ''
    );

    // Only update local value when the field or locale changes, not on every render
    React.useEffect(() => {
        const newValue = getFieldValue ? (getFieldValue(activeTranslationField, locale) ?? '') : '';
        setLocalValue(newValue);
    }, [activeTranslationField, locale]);

    const handleChange = React.useCallback((value: any) => {
        setLocalValue(value); // Update local state immediately for responsive UI
        if (onFieldValueChange && activeTranslationField) {
            onFieldValueChange(activeTranslationField, locale, value);
        }
    }, [onFieldValueChange, activeTranslationField, locale]);

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
                    field={(() => {
                        // Create a clean field definition for translation sidebar
                        const cleanField = { ...fieldDefinition };

                        // Add custom placeholder for fields that support it
                        if ('placeholder' in cleanField) {
                            (cleanField as any).placeholder = '';
                        }

                        return cleanField;
                    })()}
                    value={localValue}
                    onChange={handleChange}
                    componentData={currentComponentData}
                    formData={{}} // We don't need full form data for translation fields
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
        prevProps.fieldDefinition === nextProps.fieldDefinition
    );
});

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

function TranslationSidebarComponent({
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

    // Get field definition from schema, handling nested paths (e.g. repeater.0.field)
    const getFieldDefinition = React.useCallback((fieldPath: string): Field | null => {
        if (!currentComponentData) return null;

        const schema = getSchema(currentComponentData.schemaName);
        if (!schema) return null;

        const segments = fieldPath.split('.');
        let currentFields = flattenFields(schema.fields);
        let foundField: Field | null = null;

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];

            // Try to find the field in the current level
            // We cast to any because flattenFields returns DataField[], but we need to check properties
            const field = currentFields.find((f: any) => f.name === segment);

            if (field) {
                if (i === segments.length - 1) {
                    // We reached the end of the path and found the field
                    foundField = field;
                    break;
                }

                // If we found a repeater, we need to go deeper
                if (field.type === 'repeater' && 'fields' in field) {
                    // The next segment should be an index (number)
                    const nextSegment = segments[i + 1];
                    if (!isNaN(Number(nextSegment))) {
                        // Skip the index segment
                        i++;
                        // The repeater's fields become the current fields for the next iteration
                        // We need to flatten them too, in case there are grids/tabs inside the repeater item
                        currentFields = flattenFields(field.fields);
                        continue;
                    }
                }
            }

            // If we didn't find the field or couldn't traverse, stop
            return null;
        }

        return foundField;
    }, [currentComponentData]);

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
                case 'ArrowLeft':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        navigateToField('prev');
                    }
                    break;
                case 'ArrowRight':
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
            className={`fixed right-0 top-0 h-full bg-background border-l z-40 flex ${!isResizing ? 'transition-all duration-300' : ''}`}
            style={{ width: `${width}px` }}
        >
            {/* Resize handle */}
            <div
                className="w-px bg-border hover:bg-accent cursor-col-resize flex-shrink-0 transition-colors relative group"
                onMouseDown={handleMouseDown}
            >
                {/* Centered drag handle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 bg-border group-hover:bg-accent rounded-full transition-colors" />
            </div>

            <div className="flex-1 flex flex-col">
                {/* Sidebar header */}
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-2">
                        <LanguagesIcon className="size-5 text-muted-foreground" />
                        <h2 className="text-base font-semibold">Translations</h2>
                    </div>
                    <Button
                        onClick={closeTranslationSidebar}
                        variant="ghost"
                        size="icon"
                    >
                        ✕
                    </Button>
                </div>

                {/* Field context */}
                <div className="px-4 pb-3">
                    <div className="text-sm mb-2 font-medium">
                        {currentComponentData?.schemaName && (
                            <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">{currentComponentData.schemaName}</span>
                                <ChevronRight size={12} className="text-muted-foreground mt-0.5" />
                                <span>
                                    {(() => {
                                        const field = getFieldDefinition(activeTranslationField);
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
                            <ArrowLeft />
                            Previous
                        </Button>
                        <Button
                            onClick={() => navigateToField('next')}
                            variant="outline"
                            size="sm"
                        >
                            Next
                            <ArrowRight />
                        </Button>
                    </div>
                </div>

                {/* Translation inputs */}
                <div className="flex-1 overflow-y-auto px-4 pb-4 mt-10">
                    {availableLocales.map((locale) => (
                        <TranslationField
                            key={locale}
                            locale={locale}
                            isDefault={locale === defaultLocale}
                            activeTranslationField={activeTranslationField}
                            getFieldValue={getFieldValue}
                            onFieldValueChange={onFieldValueChange}
                            fieldDefinition={getFieldDefinition(activeTranslationField)}
                            currentComponentData={currentComponentData}
                        />
                    ))}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 text-xs text-muted-foreground space-y-2">
                    <div className="flex items-center gap-2">
                        <KbdGroup>
                            <Kbd>Ctrl</Kbd>
                            <span>+</span>
                            <Kbd><ArrowLeft /></Kbd>
                            <span>/</span>
                            <Kbd><ArrowRight /></Kbd>
                        </KbdGroup>
                        <span>Navigate fields</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Kbd>Escape</Kbd>
                        <span>Close sidebar</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

const TranslationSidebar = React.memo(TranslationSidebarComponent);
export default TranslationSidebar;