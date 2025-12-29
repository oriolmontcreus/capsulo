import type { Field } from '@/lib/form-builder';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { DEFAULT_LOCALE, LOCALES } from '@/lib/i18n-utils';
import { normalizeForComparison } from './utils';

// We need to import UndoFieldInfo type from DiffView (assuming it's exported) because we use it in props
// Ideally this type should be in a shared types file, but for now we'll define a compatible interface locally
// to avoid circular dependency issues if we try to import from DiffView.tsx
export interface UndoFieldInfo {
    componentId: string;
    fieldName: string;
    locale?: string;
    oldValue: any;
}

// Helper to check if a value is a translation object (has locale keys)
const isTranslationObject = (value: any): value is Record<string, any> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const keys = Object.keys(value);
    return keys.length > 0 && keys.some(key => LOCALES.includes(key));
};

// Types for repeater item changes
interface RepeaterItemChange {
    type: 'added' | 'removed' | 'modified';
    itemId: string;
    oldItem?: Record<string, any>;
    newItem?: Record<string, any>;
    newIndex: number;
}

interface RepeaterDiffRendererProps {
    field: Field<any>;
    oldValue: any;
    newValue: any;
    componentId: string;
    FieldDiffRenderer: React.ComponentType<{
        field: Field<any>;
        oldData: Record<string, any> | null;
        newData: Record<string, any>;
        componentId: string;
        onUndoField?: (info: UndoFieldInfo) => void;
    }>;
    onUndoField?: (info: UndoFieldInfo) => void;
}

/**
 * Renders a diff view for repeater fields, showing added, removed, and modified items.
 */
export const RepeaterDiffRenderer = ({
    field,
    oldValue,
    newValue,
    componentId,
    FieldDiffRenderer,
    onUndoField
}: RepeaterDiffRendererProps) => {
    const repeaterField = field as any;
    const repeaterFields = repeaterField.fields || [];
    const fieldLabel = repeaterField.label || repeaterField.name;
    const itemName = repeaterField.itemName || 'Item';

    // Handler for undoing a field change within a repeater item
    const handleRepeaterUndo = (locale: string, itemId: string, innerFieldName: string, innerFieldOldValue: any) => {
        if (!onUndoField) return;

        // innerFieldOldValue from FieldDiffRenderer is likely { value: "old" }
        // Repeater items store values directly, so we extract .value
        const revertedValue = innerFieldOldValue?.value !== undefined ? innerFieldOldValue.value : innerFieldOldValue;

        // We need to construct the new full repeater value (which ends up being the 'oldValue' 
        // passed to the main onUndoField handler to overwrite the current state)

        // Start with a deep clone of the current state (newValue)
        let updatedRepeaterValue = JSON.parse(JSON.stringify(newValue));

        // Helper to update the item in a specific array
        const updateItemInArray = (items: any[]) => {
            if (!Array.isArray(items)) return items;
            return items.map(item => {
                if (item._id === itemId) {
                    return { ...item, [innerFieldName]: revertedValue };
                }
                return item;
            });
        };

        if (isTranslationObject(updatedRepeaterValue)) {
            // If repeater is localized { en: [...], es: [...] }
            // Update only the array for the specific locale
            if (updatedRepeaterValue[locale]) {
                updatedRepeaterValue[locale] = updateItemInArray(updatedRepeaterValue[locale]);
            }
        } else if (Array.isArray(updatedRepeaterValue)) {
            // If repeater is non-localized [...]
            updatedRepeaterValue = updateItemInArray(updatedRepeaterValue);
        }

        // Call the main undo handler to update the repeater field with the new structure
        onUndoField({
            componentId,
            fieldName: repeaterField.name, // The top-level repeater field name
            // No locale needed here because we are passing the full structure change? 
            // Or does ChangesManager expect a locale for localized fields?
            // If repeaterField itself is translatable (which creates the {en:[], es:[]} structure),
            // then updating it usually requires passing the locale IF we are updating just one locale.
            // BUT here we constructed the FULL object value { en: [...], es: [...] }.
            // So we can pass it as a non-localized update (replacing the whole value), 
            // OR if ChangesManager merges, we might need to be careful.
            // Usually simply passing the full value works best if the backend/handler supports it.
            // Let's try passing without locale first (updating the 'value' of the field).
            oldValue: updatedRepeaterValue
        });
    };

    // Get items from translatable or non-translatable structure
    const getItemsForLocale = (value: any, locale: string): any[] => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (isTranslationObject(value)) return value[locale] || [];
        return [];
    };

    // Process all locales to find changes
    const isRepeaterTranslatable = isTranslationObject(newValue) || isTranslationObject(oldValue);
    const localesToProcess = isRepeaterTranslatable
        ? [DEFAULT_LOCALE, ...LOCALES.filter(l => l !== DEFAULT_LOCALE)]
        : [DEFAULT_LOCALE];

    // Helper to get item identifier for display
    const getItemLabel = (item: Record<string, any>, index: number): string => {
        for (const f of repeaterFields) {
            const fName = f.name;
            if (fName && (fName.toLowerCase().includes('title') || fName.toLowerCase().includes('name'))) {
                const val = item[fName];
                if (typeof val === 'string' && val.trim()) return val;
                if (isTranslationObject(val) && val[DEFAULT_LOCALE]) return val[DEFAULT_LOCALE];
            }
        }
        return `${itemName} ${index + 1}`;
    };

    // Categorize items by comparing old and new across all locales
    const localeChanges: { locale: string; changes: RepeaterItemChange[] }[] = [];

    for (const locale of localesToProcess) {
        const oldItems = getItemsForLocale(oldValue, locale);
        const newItems = getItemsForLocale(newValue, locale);

        // Create maps by _id for matching
        const oldItemsMap = new Map<string, { item: Record<string, any>; index: number }>();
        oldItems.forEach((item, index) => {
            if (item._id) oldItemsMap.set(item._id, { item, index });
        });

        const newItemsMap = new Map<string, { item: Record<string, any>; index: number }>();
        newItems.forEach((item, index) => {
            if (item._id) newItemsMap.set(item._id, { item, index });
        });

        const changes: RepeaterItemChange[] = [];

        // Find added and modified items
        newItems.forEach((newItem, index) => {
            const itemId = newItem._id;
            if (!itemId) return;

            const oldEntry = oldItemsMap.get(itemId);
            if (!oldEntry) {
                changes.push({ type: 'added', itemId, newItem, newIndex: index });
            } else {
                const oldItem = oldEntry.item;
                const hasFieldChanges = repeaterFields.some((f: any) => {
                    const oldFieldVal = normalizeForComparison(oldItem[f.name]);
                    const newFieldVal = normalizeForComparison(newItem[f.name]);
                    return JSON.stringify(oldFieldVal) !== JSON.stringify(newFieldVal);
                });
                if (hasFieldChanges) {
                    changes.push({ type: 'modified', itemId, oldItem, newItem, newIndex: index });
                }
            }
        });

        // Find removed items
        oldItems.forEach((oldItem) => {
            const itemId = oldItem._id;
            if (!itemId) return;
            if (!newItemsMap.has(itemId)) {
                changes.push({ type: 'removed', itemId, oldItem, newIndex: -1 });
            }
        });

        if (changes.length > 0) {
            localeChanges.push({ locale, changes });
        }
    }

    // If no changes across any locale, don't render
    if (localeChanges.length === 0) return null;

    return (
        <div className="py-6 space-y-4">
            <h4 className="text-sm font-semibold text-foreground">{fieldLabel}</h4>

            {localeChanges.map(({ locale, changes }) => (
                <div key={locale} className="space-y-3">
                    {isRepeaterTranslatable && (
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {locale.toUpperCase()}
                        </div>
                    )}

                    {changes.map((change) => {
                        const item = change.newItem || change.oldItem!;
                        const itemTitle = getItemLabel(item, change.newIndex >= 0 ? change.newIndex : 0);
                        const itemPosition = change.newIndex >= 0 ? change.newIndex + 1 : null;

                        return (
                            <div
                                key={change.itemId}
                                className={cn(
                                    "space-y-3",
                                    (change.type === 'added' || change.type === 'removed') && "border rounded-lg p-4",
                                    change.type === 'added' && "bg-green-500/5 border-green-500/30",
                                    change.type === 'removed' && "bg-red-500/5 border-red-500/30 opacity-70"
                                )}
                            >
                                {/* Item header with position number */}
                                <div className="flex items-center justify-between">
                                    <div className={cn(
                                        "flex items-center gap-2",
                                        change.type === 'removed' && "line-through text-muted-foreground"
                                    )}>
                                        {itemPosition && (
                                            <span className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                {itemName} {itemPosition}
                                            </span>
                                        )}
                                        <span className="text-sm font-medium">
                                            {itemTitle}
                                        </span>
                                    </div>
                                    {change.type !== 'modified' && (
                                        <Badge
                                            variant="default"
                                            className={cn(
                                                "h-5 text-[10px]",
                                                change.type === 'added' && "bg-green-600 hover:bg-green-700",
                                                change.type === 'removed' && "bg-red-600 hover:bg-red-700"
                                            )}
                                        >
                                            {change.type === 'added' && <><Plus className="h-3 w-3 mr-1" />Added</>}
                                            {change.type === 'removed' && <>Removed</>}
                                        </Badge>
                                    )}
                                </div>

                                {/* Modified items: show field diffs */}
                                {change.type === 'modified' && change.oldItem && change.newItem && (
                                    <div className="space-y-2 pt-2 border-t border-border/50">
                                        {repeaterFields.map((f: any, i: number) => {
                                            const oldFieldVal = change.oldItem![f.name];
                                            const newFieldVal = change.newItem![f.name];

                                            if (JSON.stringify(normalizeForComparison(oldFieldVal)) ===
                                                JSON.stringify(normalizeForComparison(newFieldVal))) {
                                                return null;
                                            }

                                            // Wrap values for FieldDiffRenderer which expects { value: ... } format
                                            const miniOldData = { [f.name]: { value: oldFieldVal } };
                                            const miniNewData = { [f.name]: { value: newFieldVal } };

                                            return (
                                                <FieldDiffRenderer
                                                    key={i}
                                                    field={f}
                                                    oldData={miniOldData}
                                                    newData={miniNewData}
                                                    componentId={componentId}
                                                    onUndoField={(info) => {
                                                        handleRepeaterUndo(locale, change.itemId, info.fieldName, info.oldValue);
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Added items: show all field values */}
                                {change.type === 'added' && change.newItem && (
                                    <div className="space-y-1 pt-2 border-t border-border/50 text-sm">
                                        {repeaterFields.map((f: any) => {
                                            const val = change.newItem![f.name];
                                            if (val === undefined || val === null || val === '') return null;
                                            const displayVal = isTranslationObject(val) ? val[DEFAULT_LOCALE] : val;
                                            if (!displayVal) return null;
                                            return (
                                                <div key={f.name} className="flex gap-2">
                                                    <span className="text-muted-foreground">{f.label || f.name}:</span>
                                                    <span className="text-green-600">{String(displayVal)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Removed items: show all field values */}
                                {change.type === 'removed' && change.oldItem && (
                                    <div className="space-y-1 pt-2 border-t border-border/50 text-sm">
                                        {repeaterFields.map((f: any) => {
                                            const val = change.oldItem![f.name];
                                            if (val === undefined || val === null || val === '') return null;
                                            const displayVal = isTranslationObject(val) ? val[DEFAULT_LOCALE] : val;
                                            if (!displayVal) return null;
                                            return (
                                                <div key={f.name} className="flex gap-2">
                                                    <span className="text-muted-foreground">{f.label || f.name}:</span>
                                                    <span className="line-through text-red-600/70">{String(displayVal)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};
