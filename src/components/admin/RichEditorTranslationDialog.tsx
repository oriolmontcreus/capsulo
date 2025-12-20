import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ConfigurableEditor } from '@/components/blocks/editor-x/configurable-editor';
import type { SerializedEditorState } from 'lexical';
import type { RichEditorField } from '@/lib/form-builder/fields/RichEditor/richeditor.types';
import { cn } from '@/lib/utils';

interface RichEditorTranslationDialogProps {
    locales: string[];
    defaultLocale: string;
    activeTranslationField: string;
    getFieldValue?: (fieldPath: string, locale?: string) => any;
    onFieldValueChange?: (fieldPath: string, locale: string, value: any) => void;
    fieldDefinition: RichEditorField | undefined | null;
}

// Helper to check if root structure has content
function hasRootContent(root: any): boolean {
    return root?.children?.length > 0 &&
        root.children.some((child: any) =>
            child.children?.length > 0 ||
            (child.text && child.text.trim() !== '')
        );
}

// Check if content exists for a locale
function hasContent(value: any): boolean {
    if (!value) return false;
    if (typeof value === 'string') {
        // Check if it's a non-empty JSON string
        if (value.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(value);
                return hasRootContent(parsed?.root);
            } catch {
                return false;
            }
        }
        return value.trim() !== '';
    }
    if (typeof value === 'object' && value !== null) {
        // It's a SerializedEditorState object
        return hasRootContent(value?.root);
    }
    return false;
}

export const RichEditorTranslationDialog: React.FC<RichEditorTranslationDialogProps> = React.memo(({
    locales,
    defaultLocale,
    activeTranslationField,
    getFieldValue,
    onFieldValueChange,
    fieldDefinition,
}) => {
    const [openLocale, setOpenLocale] = React.useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [localValue, setLocalValue] = React.useState<any>(null);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Get editor value when dialog opens
    React.useEffect(() => {
        if (openLocale && getFieldValue) {
            const value = getFieldValue(activeTranslationField, openLocale) ?? '';
            setLocalValue(value);
            setDialogOpen(true);
        }
    }, [openLocale, getFieldValue, activeTranslationField]);

    // Cleanup timeout on unmount
    React.useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const handleOpenChange = React.useCallback((open: boolean) => {
        if (!open) {
            setDialogOpen(false);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                setOpenLocale(null);
                setLocalValue(null);
            }, 200);
        }
    }, []);

    const handleSerializedChange = React.useCallback((editorSerializedState: SerializedEditorState) => {
        setLocalValue(editorSerializedState);
        if (onFieldValueChange && activeTranslationField && openLocale) {
            onFieldValueChange(activeTranslationField, openLocale, editorSerializedState);
        }
    }, [onFieldValueChange, activeTranslationField, openLocale]);

    // Determine if value is a JSON string or object
    const { editorSerializedState, editorStateJson } = React.useMemo(() => {
        if (!localValue) return { editorSerializedState: undefined, editorStateJson: undefined };

        if (typeof localValue === 'string') {
            if (localValue.trim().startsWith('{')) {
                return { editorSerializedState: undefined, editorStateJson: localValue };
            }
            return { editorSerializedState: undefined, editorStateJson: undefined };
        }

        return { editorSerializedState: localValue, editorStateJson: undefined };
    }, [localValue]);

    // Get features from field definition
    const features = React.useMemo(() => {
        if (!fieldDefinition) return undefined;
        return {
            enabledFeatures: fieldDefinition.features,
            disabledFeatures: fieldDefinition.disableFeatures,
            disableAllFeatures: fieldDefinition.disableAllFeatures,
            maxLength: fieldDefinition.maxLength,
        };
    }, [fieldDefinition]);

    // Memoize locale data to prevent expensive lookups in render loop
    const localeData = React.useMemo(() => {
        return locales.map(locale => {
            const value = getFieldValue?.(activeTranslationField, locale);
            return {
                locale,
                value,
                hasLocalContent: hasContent(value),
                isDefault: locale === defaultLocale
            };
        });
    }, [locales, activeTranslationField, defaultLocale, getFieldValue]);

    if (!fieldDefinition) {
        return (
            <div className="text-sm text-muted-foreground">
                Field definition not found
            </div>
        );
    }

    return (
        <>
            {/* Language buttons grid */}
            <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                    Click a language to edit its rich content
                </div>
                <div className="flex flex-wrap gap-2">
                    {localeData.map(({ locale, hasLocalContent, isDefault }) => (
                        <Button
                            key={locale}
                            variant="outline"
                            size="sm"
                            onClick={() => setOpenLocale(locale)}
                            className={cn(
                                "relative min-w-[60px] font-mono uppercase",
                                hasLocalContent && "border-green-500/50 bg-green-500/10",
                                !hasLocalContent && !isDefault && "border-amber-500/50 bg-amber-500/10"
                            )}
                        >
                            {locale}
                            {isDefault && (
                                <span className="ml-1 text-[10px] text-muted-foreground">(default)</span>
                            )}
                            {/* Content indicator */}
                            <span
                                className={cn(
                                    "absolute -top-1 -right-1 w-2 h-2 rounded-full",
                                    hasLocalContent ? "bg-green-500" : "bg-amber-500"
                                )}
                            />
                        </Button>
                    ))}
                </div>
            </div>

            {/* Rich Editor Dialog */}
            <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
                <DialogContent
                    className="min-w-[80vw] max-h-[80vh] overflow-y-auto"
                    showCloseButton
                >
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span className="font-mono uppercase">{openLocale}</span>
                            <span className="text-muted-foreground font-normal">—</span>
                            <span className="font-normal">
                                {fieldDefinition?.label || activeTranslationField}
                            </span>
                            {openLocale === defaultLocale && (
                                <span className="text-sm text-muted-foreground">(default)</span>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    {openLocale && (
                        <ConfigurableEditor
                            key={`${activeTranslationField}-${openLocale}`}
                            editorSerializedState={editorSerializedState}
                            editorStateJson={editorStateJson}
                            onSerializedChange={handleSerializedChange}
                            enabledFeatures={features?.enabledFeatures}
                            disabledFeatures={features?.disabledFeatures}
                            disableAllFeatures={features?.disableAllFeatures}
                            maxLength={features?.maxLength}
                            compact
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
});

RichEditorTranslationDialog.displayName = 'RichEditorTranslationDialog';
