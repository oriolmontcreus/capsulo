import { useState } from 'react';
import type { PageData, ComponentData, Field, DataField } from '@/lib/form-builder';
import { schemas } from '@/lib/form-builder/schemas';
import {
    InputField,
    TextareaField,
    SwitchField,
    SelectField,
    ColorPickerField,
    DateFieldComponent,
    RichEditorField,
    FileUploadField
} from '@/lib/form-builder/fields';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Undo2, Check, X } from 'lucide-react';
import { DEFAULT_LOCALE, LOCALES, isTranslationObject } from '@/lib/i18n-utils';
import { normalizeForComparison } from './utils';
import { RepeaterDiffRenderer } from './RepeaterDiffRenderer';
import { normalizeFieldType } from '@/lib/form-builder/fields/FieldRegistry';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type { UndoFieldInfo, RecoverFieldInfo } from './types';


// Helper to get the display value for a locale from a translation object
// If value is NOT a translation object (e.g., plain string), treat it as the default locale's value only
const getLocaleValue = (value: any, locale: string): any => {
    if (isTranslationObject(value)) {
        return value[locale] ?? '';
    }
    // For non-translation values, only return the value for the default locale
    // Other locales should get empty string since non-translation values don't have locale-specific content
    if (locale === DEFAULT_LOCALE) {
        return value;
    }
    return '';
};


interface DiffViewProps {
    oldPageData: PageData;
    newPageData: PageData;
    onUndoField?: (info: UndoFieldInfo) => void;
    onRecoverField?: (info: RecoverFieldInfo) => Promise<boolean>;
    hideHeader?: boolean;
    pageName?: string; // Required when onRecoverField is provided
}

// Helper to get component schema
const getSchema = (schemaName: string) => {
    // schemas is an object with keys like 'HeroSchema', 'FooterSchema'
    // component.schemaName might be 'Hero' or 'HeroSchema'. 
    // Let's try direct match first, then append Schema
    return schemas[schemaName] || schemas[`${schemaName}Schema`] || schemas[Object.keys(schemas).find(k => k.toLowerCase() === schemaName.toLowerCase()) || ''];
};

// Helper to find component data in page data by id or schemaName
const findComponentData = (pageData: PageData, componentId: string, schemaName: string): Record<string, any> | null => {
    if (!pageData?.components) return null;

    // Try to find by ID first
    let component = pageData.components.find(c => c.id === componentId);

    // If not found by ID, try by schema name (for new components or ID mismatches)
    if (!component) {
        component = pageData.components.find(c => c.schemaName === schemaName);
    }

    return component?.data || null;
};



// Helper to check if a field has changes
const isFieldModified = (field: Field<any>, oldData: Record<string, any> | null, newData: Record<string, any>): boolean => {
    if (field.type === 'grid') {
        return (field as any).fields?.some((f: any) => isFieldModified(f, oldData, newData)) ?? false;
    }
    if (field.type === 'tabs') {
        return (field as any).tabs?.some((tab: any) => tab.fields?.some((f: any) => isFieldModified(f, oldData, newData))) ?? false;
    }

    const fieldName = (field as any).name;
    if (!fieldName) return false;

    const newValue = normalizeForComparison(newData[fieldName]?.value);
    const oldValue = normalizeForComparison(oldData?.[fieldName]?.value);

    // Both undefined/null/empty → no change
    if (newValue === undefined && oldValue === undefined) return false;

    const isModified = JSON.stringify(oldValue) !== JSON.stringify(newValue);

    return isModified;
};

const FieldDiffRenderer = ({
    field,
    oldData,
    newData,
    componentId,
    onUndoField,
    onRecoverField,
    pageName
}: {
    field: Field<any>,
    oldData: Record<string, any> | null,
    newData: Record<string, any>,
    componentId: string,
    onUndoField?: (info: UndoFieldInfo) => void,
    onRecoverField?: (info: RecoverFieldInfo) => Promise<boolean>,
    pageName?: string
}) => {
    // Hide field if no changes
    if (!isFieldModified(field, oldData, newData)) return null;

    // For layouts, we don't look up a value, we just render children
    if (field.type === 'grid') {
        return (
            <div className="space-y-4 w-full border-b last:border-0">
                {(field as any).fields?.map((childField: Field<any>, i: number) => (
                    <FieldDiffRenderer
                        key={i}
                        field={childField}
                        oldData={oldData}
                        newData={newData}
                        componentId={componentId}
                        onUndoField={onUndoField}
                        onRecoverField={onRecoverField}
                        pageName={pageName}
                    />
                ))}
            </div>
        );
    }

    if (field.type === 'tabs') {
        return (
            <div className="space-y-4 w-full border-b last:border-0">
                {(field as any).tabs?.map((tab: any) => {
                    // Filter out tabs that have no changes in their fields
                    const hasChanges = tab.fields?.some((f: any) => isFieldModified(f, oldData, newData));
                    if (!hasChanges) return null;

                    return (
                        <div key={tab.label} className="space-y-4 border-b last:border-0">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tab.label}</h4>
                            {tab.fields?.map((childField: Field<any>, i: number) => (
                                <FieldDiffRenderer
                                    key={i}
                                    field={childField}
                                    oldData={oldData}
                                    newData={newData}
                                    componentId={componentId}
                                    onUndoField={onUndoField}
                                    onRecoverField={onRecoverField}
                                    pageName={pageName}
                                />
                            ))}
                        </div>
                    );
                })}
            </div>
        );
    }

    const fieldName = (field as any).name;
    // If no name and not a layout handled above, we can't do much
    if (!fieldName) return null;

    const newValue = newData[fieldName]?.value;
    const oldValue = oldData?.[fieldName]?.value;

    // Check if this is a translatable field (value is a translation object)
    const isTranslatable = isTranslationObject(newValue);

    if (field.type === 'repeater') {
        return (
            <RepeaterDiffRenderer
                field={field}
                oldValue={oldValue}
                newValue={newValue}
                componentId={componentId}
                FieldDiffRenderer={FieldDiffRenderer}
                onUndoField={onUndoField}
                onRecoverField={onRecoverField}
                pageName={pageName}
            />
        );
    }

    // Render Data Field with optional diff mode
    const renderFieldInput = (f: any, val: any, diffOptions?: { diffMode: boolean; diffOldValue: string }) => {
        const normalizedType = normalizeFieldType(f.type);

        // Handle translation objects - extract the string value
        // For rich editor and file upload, we want to preserve the object value if it's not a translation map
        let displayValue: any;

        if (val === null || val === undefined) {
            displayValue = '';
        } else if (typeof val === 'string') {
            displayValue = val;
        } else if (isTranslationObject(val)) {
            displayValue = val[DEFAULT_LOCALE] ?? '';
        } else {
            // It's an object but not a translation map
            // Preserve object for these types, stringify for others
            if (['richeditor', 'fileUpload'].includes(normalizedType)) {
                displayValue = val;
            } else {
                displayValue = String(val);
            }
        }

        const commonProps = {
            field: f,
            value: displayValue,
            onChange: () => { }, // Read only
            error: undefined,
            // Add diff props if provided
            ...(diffOptions && {
                diffMode: diffOptions.diffMode,
                diffOldValue: diffOptions.diffOldValue
            })
        };

        //TODO: At some point remove this switch case case hell man...
        try {
            switch (normalizedType) {
                case 'input':
                    // Handle number inputs specially
                    if (f.type === 'number') {
                        return <InputField {...commonProps} field={{ ...f, inputType: 'number' }} />;
                    }
                    return <InputField {...commonProps} />;
                case 'textarea':
                    return <TextareaField {...commonProps} />;
                case 'switch':
                    return <SwitchField {...commonProps} value={val} />;
                case 'select':
                    return <SelectField {...commonProps} value={val} />;
                case 'colorpicker':
                    return <ColorPickerField {...commonProps} value={val} />;
                case 'datefield':
                    return <DateFieldComponent {...commonProps} value={val} />;
                case 'richeditor':
                    // Pass the value directly (object or string) - RichEditorField handles both
                    // In diff mode (even side-by-side), we want it read-only
                    return <RichEditorField {...commonProps} readOnly={true} />;
                case 'fileUpload':
                    return <FileUploadField {...commonProps} value={val} />;
                default:
                    return <div className="text-xs text-muted-foreground">Unsupported field type: {f.type}</div>;
            }
        } catch (e) {
            return <div className="text-xs text-red-500">Error rendering field</div>;
        }
    };

    // Helper to convert value to string for diff comparison
    const getStringValue = (val: any): string => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'string') return val;
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
    };

    // Check if this field type supports inline diff (text-based fields using Lexical)
    const supportsInlineDiff = (fieldType: string): boolean => {
        const normalizedType = normalizeFieldType(fieldType);
        // Rich editor is excluded because inline text diff destroys rich formatting
        return ['input', 'textarea'].includes(normalizedType);
    };

    // State for recover feedback - track field+locale that was recovered and status
    const [recoverFeedback, setRecoverFeedback] = useState<{
        key: string;
        status: 'success' | 'error';
    } | null>(null);

    // Helper to render a single locale row with inline diff in the field itself
    const renderLocaleRow = (locale: string, oldLocaleValue: any, newLocaleValue: any, isDefaultLocale: boolean) => {
        const localeOldVal = normalizeForComparison(isTranslatable ? getLocaleValue(oldLocaleValue, locale) : oldLocaleValue);
        const localeNewVal = normalizeForComparison(isTranslatable ? getLocaleValue(newLocaleValue, locale) : newLocaleValue);

        // Both undefined/null/empty → no change
        const isLocaleModified = !(localeOldVal === undefined && localeNewVal === undefined) &&
            JSON.stringify(localeOldVal) !== JSON.stringify(localeNewVal);

        // Skip any locale (including default) if there's no change
        if (!isLocaleModified) return null;

        // Skip locales that have no value (empty string) in both old and new  
        if (!localeNewVal && !localeOldVal) return null;

        const oldString = getStringValue(localeOldVal);
        const newString = getStringValue(localeNewVal);
        const canShowInlineDiff = supportsInlineDiff(field.type);

        // Create a modified field with locale suffix in label for non-default locales
        const localeBadge = isTranslatable && !isDefaultLocale ? ` [${locale.toUpperCase()}]` : '';
        const fieldWithLocale = {
            ...field,
            label: ((field as any).label || (field as any).name) + localeBadge,
            description: undefined
        };

        // Unique key for this field/locale for feedback tracking
        const feedbackKey = `${fieldName}-${locale}`;

        // Handle undo button click
        const handleUndo = () => {
            if (!onUndoField) return;
            onUndoField({
                componentId,
                fieldName,
                locale: isTranslatable ? locale : undefined,
                oldValue: localeOldVal,
                fieldType: field.type
            });
        };

        // Handle recover button click
        const handleRecover = async () => {
            if (!onRecoverField || !pageName) return;

            try {
                const success = await onRecoverField({
                    componentId,
                    fieldName,
                    locale: isTranslatable ? locale : undefined,
                    valueToRecover: localeOldVal,
                    fieldType: field.type,
                    pageName
                });

                setRecoverFeedback({ key: feedbackKey, status: success ? 'success' : 'error' });

                // Clear feedback after animation
                setTimeout(() => setRecoverFeedback(null), 2000);
            } catch (err) {
                setRecoverFeedback({ key: feedbackKey, status: 'error' });
                setTimeout(() => setRecoverFeedback(null), 2000);
            }
        };

        // Check if this row is showing feedback
        const showingFeedback = recoverFeedback?.key === feedbackKey;

        return (
            <div key={locale} className="relative group">
                {/* Field content - full width */}
                <div className="w-full">
                    {/* Single field with inline diff for text-based fields */}
                    {canShowInlineDiff ? (
                        <div className="pointer-events-none">
                            {renderFieldInput(fieldWithLocale, newString, {
                                diffMode: true,
                                diffOldValue: oldString
                            })}
                        </div>
                    ) : (
                        // For non-text fields, show side by side comparison
                        <div className="grid grid-cols-2 gap-6">
                            {/* Old Value */}
                            <div className="opacity-60 pointer-events-none">
                                <div className="text-xs text-muted-foreground mb-1.5">Previous</div>
                                {renderFieldInput(fieldWithLocale, localeOldVal)}
                            </div>

                            {/* New Value */}
                            <div className="pointer-events-none">
                                <div className="text-xs text-muted-foreground mb-1.5">Current</div>
                                {renderFieldInput(fieldWithLocale, localeNewVal)}
                            </div>
                        </div>
                    )}
                </div>

                {/* Undo button - absolutely positioned, visible on hover */}
                {onUndoField && isLocaleModified && (
                    <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <TooltipProvider delayDuration={300}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
                                        onClick={handleUndo}
                                    >
                                        <Undo2 className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                    <p>Revert to previous value</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                )}

                {/* Recover button - for history view, visible on hover with feedback */}
                {onRecoverField && isLocaleModified && (
                    <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        {showingFeedback ? (
                            // Feedback indicator
                            <div className={`h-6 w-6 flex items-center justify-center rounded-md transition-all duration-200 ${recoverFeedback?.status === 'success'
                                ? 'bg-green-500/10 text-green-600'
                                : 'bg-red-500/10 text-red-600'
                                }`}>
                                {recoverFeedback?.status === 'success'
                                    ? <Check className="h-3.5 w-3.5" />
                                    : <X className="h-3.5 w-3.5" />
                                }
                            </div>
                        ) : (
                            <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
                                            onClick={handleRecover}
                                        >
                                            <Undo2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">
                                        <p>Recover this value</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // If translatable, render a row for each locale (default first, then others with changes)
    if (isTranslatable) {
        // Get all locales, with default first
        const orderedLocales = [DEFAULT_LOCALE, ...LOCALES.filter(l => l !== DEFAULT_LOCALE)];

        // Pre-render all locale rows and filter out nulls to avoid empty spacers
        const localeRows = orderedLocales
            .map(locale => renderLocaleRow(locale, oldValue, newValue, locale === DEFAULT_LOCALE))
            .filter(Boolean);

        // If no locale rows have changes, don't render anything
        if (localeRows.length === 0) return null;

        return (
            <div className="py-4 space-y-4">
                {localeRows}
            </div>
        );
    }

    // Non-translatable field - single row
    const row = renderLocaleRow(DEFAULT_LOCALE, oldValue, newValue, true);
    if (!row) return null;

    return (
        <div className="py-4">
            {row}
        </div>
    );
};


export function DiffView({ oldPageData, newPageData, onUndoField, onRecoverField, hideHeader = false, pageName }: DiffViewProps) {
    // Use newPageData as the source of truth for what components to show
    const components = newPageData?.components || [];

    if (components.length === 0) {
        // If hidden header and no components, show minimal message or nothing
        return <div className="p-8 text-center text-muted-foreground">No components on this page.</div>;
    }

    // Pre-calculate which components have changes
    const componentsWithChanges = components.map((component: ComponentData) => {
        const schema = getSchema(component.schemaName);
        if (!schema) return { component, hasChanges: true, schema: null }; // Show missing schema warning

        const newData = component.data || {};
        const oldData = findComponentData(oldPageData, component.id, component.schemaName);
        const isNewComponent = !oldData;
        const hasChanges = isNewComponent || schema.fields.some((f: Field<any>) => isFieldModified(f, oldData, newData));

        return { component, hasChanges, schema, oldData, newData, isNewComponent };
    }).filter(c => c.hasChanges);

    // If no components have changes, show empty state
    if (componentsWithChanges.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground">
                <p className="text-lg font-medium text-foreground/80">No changes to display</p>
                <p className="text-sm mt-1">All content matches the remote version</p>
            </div>
        );
    }

    // Removed p-8 to allow caller to control padding
    return (
        <div className="space-y-12">
            {componentsWithChanges.map(({ component, schema, oldData, newData, isNewComponent }) => {
                if (!schema) {
                    return (
                        <Card key={component.id} className="border-dashed">
                            <CardHeader>
                                <CardTitle className="text-sm font-mono text-muted-foreground">
                                    Missing Schema: {component.schemaName}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                    )
                }

                return (
                    <div key={component.id} className="space-y-0">
                        {/* Conditionally hide header */}
                        {!hideHeader && (
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-bold tracking-tight">{schema.name}</h2>
                                {isNewComponent && (
                                    <Badge variant="default" className="bg-green-600 hover:bg-green-700 h-5 text-[10px]">
                                        <Plus className="h-3 w-3 mr-1" />
                                        New
                                    </Badge>
                                )}
                            </div>
                        )}

                        {schema.fields.map((field: Field<any>, i: number) => {
                            return (
                                <FieldDiffRenderer
                                    key={i}
                                    field={field}
                                    oldData={oldData ?? null}
                                    newData={newData ?? {}}
                                    componentId={component.id}
                                    onUndoField={onUndoField}
                                    onRecoverField={onRecoverField}
                                    pageName={pageName}
                                />
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}
