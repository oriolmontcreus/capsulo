import * as React from "react";
import { useTranslation } from "@/lib/form-builder/context/TranslationContext";
import { getSchema } from "@/lib/form-builder/core/schemaRegistry";
import { flattenFields } from "@/lib/form-builder/core/fieldHelpers";
import { getFieldComponent } from "@/lib/form-builder/fields/FieldRegistry";
import type { Field } from "@/lib/form-builder/core/types";

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
            <div className={`rounded-lg border p-4 ${isDefault ? 'border-primary/50' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="uppercase font-mono text-sm">{locale}</span>
                        {isDefault && (
                            <div className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                                Default
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-sm text-muted-foreground">
                    Field definition not found for: {activeTranslationField}
                </div>
            </div>
        );
    }

    // Get the field component from registry
    const FieldComponent = getFieldComponent(fieldDefinition.type);

    if (!FieldComponent) {
        return (
            <div className={`rounded-lg border p-4 ${isDefault ? 'border-primary/50' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="uppercase font-mono text-sm">{locale}</span>
                        {isDefault && (
                            <div className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                                Default
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-sm text-muted-foreground">
                    No component found for field type: {fieldDefinition.type}
                </div>
            </div>
        );
    }

    return (
        <div className={`rounded-lg border p-4 ${isDefault ? 'border-primary/50' : ''}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="uppercase font-mono text-sm">{locale}</span>
                    {isDefault && (
                        <div className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                            Default
                        </div>
                    )}
                </div>
                <div className="w-2 h-2 rounded-full bg-red-500" title="Translation missing" />
            </div>

            {/* Render the actual field component without label and description */}
            <div className="[&_label]:hidden [&_[data-slot=field-description]]:hidden">
                <FieldComponent
                    field={(() => {
                        // Create a clean field definition for translation sidebar
                        const cleanField = { ...fieldDefinition };

                        // Add custom placeholder for fields that support it
                        if ('placeholder' in cleanField) {
                            (cleanField as any).placeholder = `Enter ${activeTranslationField} in ${locale.toUpperCase()}`;
                        }

                        return cleanField;
                    })()}
                    value={localValue}
                    onChange={handleChange}
                    componentData={currentComponentData}
                    formData={{}} // We don't need full form data for translation fields
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

    // Get field definition from schema
    const getFieldDefinition = React.useCallback((fieldPath: string): Field | null => {
        if (!currentComponentData) return null;

        const schema = getSchema(currentComponentData.schemaName);
        if (!schema) return null;

        // Flatten all fields from the schema to find the specific field
        const allFields = flattenFields(schema.fields);
        return allFields.find(field => field.name === fieldPath) || null;
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
                        {(() => {
                            const fieldDef = getFieldDefinition(activeTranslationField);
                            return fieldDef ? (
                                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                                    {fieldDef.type}
                                </div>
                            ) : (
                                <div className="inline-flex items-center rounded-full border border-destructive px-2.5 py-0.5 text-xs font-semibold text-destructive">
                                    unknown
                                </div>
                            );
                        })()}
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