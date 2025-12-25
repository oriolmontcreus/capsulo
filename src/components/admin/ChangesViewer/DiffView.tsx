import React from 'react';
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
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowRightIcon } from 'lucide-react';
import { DEFAULT_LOCALE, LOCALES } from '@/lib/i18n-utils';

// Helper to check if a value is a translation object (has locale keys)
const isTranslationObject = (value: any): value is Record<string, any> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    // Check if at least one key matches a known locale
    const keys = Object.keys(value);
    return keys.length > 0 && keys.some(key => LOCALES.includes(key));
};

// Helper to get the display value for a locale from a translation object
const getLocaleValue = (value: any, locale: string): any => {
    if (isTranslationObject(value)) {
        return value[locale] ?? '';
    }
    return value;
};

interface DiffViewProps {
    pageData: PageData;
}

// Helper to get component schema
const getSchema = (schemaName: string) => {
    // schemas is an object with keys like 'HeroSchema', 'FooterSchema'
    // component.schemaName might be 'Hero' or 'HeroSchema'. 
    // Let's try direct match first, then append Schema
    return schemas[schemaName] || schemas[`${schemaName}Schema`] || schemas[Object.keys(schemas).find(k => k.toLowerCase() === schemaName.toLowerCase()) || ''];
};

// Mock old value generator
const getMockOldValue = (newValue: any, type: string) => {
    if (newValue === undefined || newValue === null) return newValue;

    switch (type) {
        case 'text':
        case 'textarea':
        case 'rich-text':
            if (typeof newValue === 'string') {
                const words = newValue.split(' ');
                if (words.length > 1) {
                    return words.slice(0, -1).join(' ') + ' (old)'; // remove last word and append old
                }
                return `Old ${newValue}`;
            }
            return newValue;
        case 'number':
            return typeof newValue === 'number' ? newValue - 1 : newValue;
        case 'switch':
        case 'boolean':
            return !newValue;
        case 'color':
            return newValue === '#000000' ? '#ffffff' : '#000000';
        default:
            return newValue; // Return same for unknown types to show no change
    }
};

const FieldDiffRenderer = ({
    field,
    data
}: {
    field: Field<any>,
    data: Record<string, any>
}) => {
    // For layouts, we don't look up a value, we just render children
    if (field.type === 'grid') {
        return (
            <div className="space-y-4 w-full">
                {(field as any).fields?.map((childField: Field<any>, i: number) => (
                    <FieldDiffRenderer
                        key={i}
                        field={childField}
                        data={data}
                    />
                ))}
            </div>
        );
    }

    if (field.type === 'tabs') {
        return (
            <div className="space-y-4 w-full">
                {(field as any).tabs?.map((tab: any) => (
                    <div key={tab.label} className="space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tab.label}</h4>
                        {tab.fields?.map((childField: Field<any>, i: number) => (
                            <FieldDiffRenderer
                                key={i}
                                field={childField}
                                data={data}
                            />
                        ))}
                    </div>
                ))}
            </div>
        );
    }

    const fieldName = (field as any).name;
    // If no name and not a layout handled above, we can't do much
    if (!fieldName) return null;

    const newValue = data[fieldName]?.value;
    const oldValue = getMockOldValue(newValue, field.type);

    // Check if this is a translatable field (value is a translation object)
    const isTranslatable = isTranslationObject(newValue);

    if (field.type === 'repeater') {
        // ... repeater logic using oldValue/newValue ...
        // Simplicity: Show simplified diff for Repeater
        const isModified = JSON.stringify(oldValue) !== JSON.stringify(newValue);
        return (
            <div className="grid grid-cols-2 gap-8 py-4 border-b last:border-0 items-start">
                <div className="opacity-70 pointer-events-none">
                    <label className="text-sm font-medium mb-2 block">{fieldName} (Old)</label>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-[200px]">
                        {JSON.stringify(oldValue, null, 2)}
                    </pre>
                </div>
                <div className={cn("pointer-events-none", isModified && "bg-blue-50/50 -m-2 p-2 rounded")}>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">{fieldName} (New)</label>
                        {isModified && <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 h-5 text-[10px]">Changed</Badge>}
                    </div>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-[200px]">
                        {JSON.stringify(newValue, null, 2)}
                    </pre>
                </div>
            </div>
        )
    }

    // Render Data Field
    const renderFieldInput = (f: any, val: any) => {
        // Handle translation objects - extract the string value
        const displayValue = typeof val === 'string' ? val :
            (val === null || val === undefined) ? '' :
                isTranslationObject(val) ? (val[DEFAULT_LOCALE] ?? '') :
                    String(val);

        const commonProps = {
            field: f,
            value: displayValue,
            onChange: () => { }, // Read only
            error: undefined,
        };

        try {
            switch (f.type) {
                case 'text':
                case 'email':
                case 'password':
                case 'url':
                case 'input':
                    return <InputField {...commonProps} />;
                case 'number':
                    return <InputField {...commonProps} field={{ ...f, inputType: 'number' }} />;
                case 'textarea':
                    return <TextareaField {...commonProps} />;
                case 'switch':
                    return <SwitchField {...commonProps} value={val} />;
                case 'select':
                    return <SelectField {...commonProps} value={val} />;
                case 'color':
                    return <ColorPickerField {...commonProps} value={val} />;
                case 'date':
                case 'datefield':
                    return <DateFieldComponent {...commonProps} value={val} />;
                case 'rich-text':
                case 'richeditor':
                    return <RichEditorField {...commonProps} value={typeof displayValue === 'string' ? displayValue : (displayValue ? JSON.stringify(displayValue) : '')} />;
                case 'file':
                case 'image':
                case 'fileUpload':
                    return <FileUploadField {...commonProps} value={val} />;
                default:
                    return <div className="text-xs text-muted-foreground">Unsupported field type: {f.type}</div>;
            }
        } catch (e) {
            return <div className="text-xs text-red-500">Error rendering field</div>;
        }
    };

    // Helper to render a single locale row
    const renderLocaleRow = (locale: string, oldLocaleValue: any, newLocaleValue: any, isDefaultLocale: boolean) => {
        const localeOldVal = isTranslatable ? getLocaleValue(oldLocaleValue, locale) : oldLocaleValue;
        const localeNewVal = isTranslatable ? getLocaleValue(newLocaleValue, locale) : newLocaleValue;
        const isLocaleModified = JSON.stringify(localeOldVal) !== JSON.stringify(localeNewVal);

        // For non-default locales, only show if there's a change
        if (!isDefaultLocale && !isLocaleModified) return null;

        // Skip non-default locales that have no value (empty string) in both old and new
        if (!isDefaultLocale && !localeNewVal && !localeOldVal) return null;

        return (
            <div key={locale} className="grid grid-cols-[1fr_auto_1fr] gap-4 py-4 border-b last:border-0 items-start group">
                {/* Old Value */}
                <div className="opacity-60 pointer-events-none group-hover:opacity-80 transition-opacity">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="text-xs text-muted-foreground">Old</div>
                        {isTranslatable && (
                            <Badge variant="outline" className="text-[10px] px-1 h-4 uppercase font-mono">
                                {locale}
                            </Badge>
                        )}
                    </div>
                    {renderFieldInput(field, localeOldVal)}
                </div>

                {/* Arrow / Status */}
                <div className="flex flex-col items-center justify-center pt-8 text-muted-foreground/30">
                    <ArrowRightIcon className="w-5 h-5" />
                </div>

                {/* New Value */}
                <div className={cn(
                    "pointer-events-none rounded-md p-2 -m-2 transition-colors",
                    isLocaleModified ? "bg-amber-100/20" : ""
                )}>
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <div className="text-xs text-muted-foreground">New</div>
                            {isTranslatable && (
                                <Badge variant="outline" className="text-[10px] px-1 h-4 uppercase font-mono">
                                    {locale}
                                </Badge>
                            )}
                        </div>
                        {isLocaleModified && <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 h-4 text-[10px] px-1">Modified</Badge>}
                    </div>
                    {renderFieldInput(field, localeNewVal)}
                </div>
            </div>
        );
    };

    // If translatable, render a row for each locale (default first, then others with changes)
    if (isTranslatable) {
        // Get all locales, with default first
        const orderedLocales = [DEFAULT_LOCALE, ...LOCALES.filter(l => l !== DEFAULT_LOCALE)];

        return (
            <div className="space-y-0">
                {orderedLocales.map(locale => renderLocaleRow(locale, oldValue, newValue, locale === DEFAULT_LOCALE))}
            </div>
        );
    }

    // Non-translatable field - single row
    return renderLocaleRow(DEFAULT_LOCALE, oldValue, newValue, true);
};


export function DiffView({ pageData }: DiffViewProps) {
    if (!pageData.components || pageData.components.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">No components on this page.</div>;
    }

    return (
        <div className="p-8 space-y-12 max-w-5xl mx-auto">
            {pageData.components.map((component, index) => {
                const schema = getSchema(component.schemaName);
                const newData = component.data || {};

                // Prepare data with mocked old values
                // We need to pass down individual field values to the renderer
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
                    <div key={component.id} className="space-y-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold tracking-tight">{schema.name}</h2>
                            <Badge variant="secondary" className="font-mono text-xs text-muted-foreground">
                                {component.alias || component.schemaName}
                            </Badge>
                        </div>

                        <Card className="overflow-hidden border-none shadow-md bg-card ring-1 ring-border/50">
                            <CardContent className="p-6">
                                {schema.fields.map((field: Field<any>, i: number) => {
                                    return (
                                        <FieldDiffRenderer
                                            key={i}
                                            field={field}
                                            data={newData}
                                        />
                                    );
                                })}
                            </CardContent>
                        </Card>
                    </div>
                );
            })}
        </div>
    );
}
