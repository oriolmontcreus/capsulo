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
import { ArrowRightIcon, Plus, Minus } from 'lucide-react';
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
    oldPageData: PageData;
    newPageData: PageData;
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

    const newValue = newData[fieldName]?.value;
    const oldValue = oldData?.[fieldName]?.value;

    return JSON.stringify(oldValue) !== JSON.stringify(newValue);
};

const FieldDiffRenderer = ({
    field,
    oldData,
    newData
}: {
    field: Field<any>,
    oldData: Record<string, any> | null,
    newData: Record<string, any>
}) => {
    // Hide field if no changes
    if (!isFieldModified(field, oldData, newData)) return null;

    // For layouts, we don't look up a value, we just render children
    if (field.type === 'grid') {
        return (
            <div className="space-y-4 w-full">
                {(field as any).fields?.map((childField: Field<any>, i: number) => (
                    <FieldDiffRenderer
                        key={i}
                        field={childField}
                        oldData={oldData}
                        newData={newData}
                    />
                ))}
            </div>
        );
    }

    if (field.type === 'tabs') {
        return (
            <div className="space-y-4 w-full">
                {(field as any).tabs?.map((tab: any) => {
                    // Filter out tabs that have no changes in their fields
                    const hasChanges = tab.fields?.some((f: any) => isFieldModified(f, oldData, newData));
                    if (!hasChanges) return null;

                    return (
                        <div key={tab.label} className="space-y-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tab.label}</h4>
                            {tab.fields?.map((childField: Field<any>, i: number) => (
                                <FieldDiffRenderer
                                    key={i}
                                    field={childField}
                                    oldData={oldData}
                                    newData={newData}
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


export function DiffView({ oldPageData, newPageData }: DiffViewProps) {
    // Use newPageData as the source of truth for what components to show
    const components = newPageData?.components || [];

    if (components.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">No components on this page.</div>;
    }

    return (
        <div className="p-8 space-y-12 max-w-5xl mx-auto">
            {components.map((component: ComponentData, index: number) => {
                const schema = getSchema(component.schemaName);
                const newData = component.data || {};

                // Find corresponding old data for this component
                const oldData = findComponentData(oldPageData, component.id, component.schemaName);

                // Determine if this is a new component (no old data)
                const isNewComponent = !oldData;

                // Check if the component has any changes at all
                const hasChanges = isNewComponent || schema.fields.some((f: Field<any>) => isFieldModified(f, oldData, newData));

                if (!hasChanges) return null;

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
                            {isNewComponent && (
                                <Badge variant="default" className="bg-green-600 hover:bg-green-700 h-5 text-[10px]">
                                    <Plus className="h-3 w-3 mr-1" />
                                    New
                                </Badge>
                            )}
                        </div>

                        <Card className="overflow-hidden border-none shadow-md bg-card ring-1 ring-border/50">
                            <CardContent className="p-6">
                                {schema.fields.map((field: Field<any>, i: number) => {
                                    return (
                                        <FieldDiffRenderer
                                            key={i}
                                            field={field}
                                            oldData={oldData}
                                            newData={newData}
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
