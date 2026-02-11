import * as React from "react";
import { LanguagesIcon, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RichEditorTranslationDialog } from "../RichEditorTranslationDialog";
import { getFieldComponent } from "@/lib/form-builder/fields/FieldRegistry";
import type { Field } from "@/lib/form-builder/core/types";
import { getSchema } from "@/lib/form-builder/core/schemaRegistry";
import { flattenFields } from "@/lib/form-builder/core/fieldHelpers";

interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

interface TranslationFieldProps {
    locale: string;
    isDefault: boolean;
    activeTranslationField: string;
    getFieldValue?: (fieldPath: string, locale?: string) => any;
    onFieldValueChange?: (fieldPath: string, locale: string, value: any, componentId?: string) => void;
    fieldDefinition: Field | null;
    currentComponentData?: ComponentData;
}

const TranslationField = React.memo<TranslationFieldProps>(({
    locale,
    isDefault,
    activeTranslationField,
    getFieldValue,
    onFieldValueChange,
    fieldDefinition,
    currentComponentData
}) => {
    const currentValue = getFieldValue ? (getFieldValue(activeTranslationField, locale) ?? '') : '';

    const handleChange = React.useCallback((value: any) => {
        if (onFieldValueChange && activeTranslationField && currentComponentData?.id) {
            onFieldValueChange(activeTranslationField, locale, value, currentComponentData.id);
        }
    }, [onFieldValueChange, activeTranslationField, locale, currentComponentData?.id]);

    const cleanField = React.useMemo(() => {
        const clean = { ...(fieldDefinition || {}) } as Field;
        if (fieldDefinition && 'placeholder' in clean) {
            (clean as any).placeholder = '';
        }
        return clean;
    }, [fieldDefinition]);

    const emptyFormData = React.useMemo(() => ({}), []);

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
        <div className="mb-4 min-w-0">
            <div className="flex items-center gap-2 mb-2">
                <span className="uppercase font-mono text-sm font-medium">{locale}</span>
                {isDefault && (
                    <span className="text-sm text-muted-foreground">(default)</span>
                )}
            </div>

            <div className="[&_label]:hidden [&_[data-slot=field-description]]:hidden w-full overflow-hidden [&_input]:w-full [&_input]:min-w-0 [&_textarea]:w-full [&_textarea]:min-w-0 p-1">
                <FieldComponent
                    field={cleanField}
                    value={currentValue}
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

interface TranslationsTabProps {
    isTranslationModeActive: boolean;
    activeTranslationField: string | null;
    availableLocales: string[];
    defaultLocale: string;
    currentComponentData?: ComponentData;
    getFieldValue?: (fieldPath: string, locale?: string) => any;
    onFieldValueChange?: (fieldPath: string, locale: string, value: any, componentId?: string) => void;
}

export const TranslationsTab: React.FC<TranslationsTabProps> = ({
    isTranslationModeActive,
    activeTranslationField,
    availableLocales,
    defaultLocale,
    currentComponentData,
    getFieldValue,
    onFieldValueChange,
}) => {
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

    const activeFieldDef = React.useMemo(() => {
        return activeTranslationField ? getFieldDefinition(activeTranslationField) : null;
    }, [activeTranslationField, getFieldDefinition]);

    const activeFieldLabel = React.useMemo(() => {
        return (activeFieldDef && 'label' in activeFieldDef && activeFieldDef.label) || activeTranslationField;
    }, [activeFieldDef, activeTranslationField]);

    return (
        <div className="flex-1 flex flex-col overflow-hidden">

            {isTranslationModeActive && (
                <div className="px-4 flex items-center border-b h-[41px] bg-sidebar">
                    <div className="text-sm font-medium truncate w-full">
                        {currentComponentData?.schemaName && (
                            <div className="flex items-center gap-1">
                                <span className="text-muted-foreground/60 truncate">{currentComponentData.schemaName}</span>
                                <ChevronRight size={12} className="text-muted-foreground/40 mt-0.5 shrink-0" />
                                <span className="truncate text-foreground/80">
                                    {activeFieldLabel}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <ScrollArea className="flex-1">
                {isTranslationModeActive ? (
                    <div className="p-4 space-y-4 overflow-hidden min-w-0">
                        {(() => {
                            const fieldDef = activeFieldDef;
                            const isRichEditor = fieldDef?.type === 'richeditor';

                            if (isRichEditor) {
                                return (
                                    <RichEditorTranslationDialog
                                        locales={availableLocales}
                                        defaultLocale={defaultLocale}
                                        activeTranslationField={activeTranslationField || ''}
                                        getFieldValue={getFieldValue}
                                        onFieldValueChange={onFieldValueChange}
                                        fieldDefinition={fieldDef}
                                        currentComponentData={currentComponentData}
                                    />
                                );
                            }

                            return availableLocales
                                .filter(locale => locale !== defaultLocale)
                                .map((locale) => (
                                    <TranslationField
                                        key={`${activeTranslationField}-${locale}`}
                                        locale={locale}
                                        isDefault={false}
                                        activeTranslationField={activeTranslationField || ''}
                                        getFieldValue={getFieldValue}
                                        onFieldValueChange={onFieldValueChange}
                                        fieldDefinition={fieldDef}
                                        currentComponentData={currentComponentData}
                                    />
                                ));
                        })()}
                    </div>
                ) : (
                    <div className="p-6 space-y-6">
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Click on any translatable field to see its translation options here.
                                Translatable fields are marked with a colored indicator.
                            </p>
                            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <LanguagesIcon className="size-3 inline-block mx-1 align-middle text-green-500" />
                                    <span className="text-muted-foreground">All translations complete</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <LanguagesIcon className="size-3 inline-block mx-1 align-middle text-red-500" />
                                    <span className="text-muted-foreground">Missing translations</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
};
