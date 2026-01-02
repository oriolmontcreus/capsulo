import React, { useMemo } from 'react';
import type { Field } from '@/lib/form-builder';
import { cn } from '@/lib/utils';
import { DEFAULT_LOCALE, LOCALES, isTranslationObject } from '@/lib/i18n-utils';
import { normalizeForComparison } from './utils';
import { LexicalCMSField } from '@/lib/form-builder/lexical/LexicalCMSField';
import { normalizeFieldType } from '@/lib/form-builder/fields/FieldRegistry';
import type { UndoFieldInfo, RecoverFieldInfo } from './types';
import { MinusIcon, PlusIcon } from 'lucide-react';



// Types for repeater item changes
interface RepeaterItemChange {
    type: 'added' | 'removed' | 'modified';
    itemId: string;
    oldItem?: Record<string, any>;
    newItem?: Record<string, any>;
    newIndex: number;
    oldIndex?: number;
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
        onRecoverField?: (info: RecoverFieldInfo) => Promise<boolean>;
        pageName?: string;
    }>;
    onUndoField?: (info: UndoFieldInfo) => void;
    onRecoverField?: (info: RecoverFieldInfo) => Promise<boolean>;
    pageName?: string;
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
    onUndoField,
    onRecoverField,
    pageName
}: RepeaterDiffRendererProps) => {
    const repeaterField = field as any;
    const repeaterFields = repeaterField.fields || [];
    const fieldLabel = repeaterField.label || repeaterField.name;
    const itemName = repeaterField.itemName || 'Item';

    // Handler for undoing a field change within a repeater item
    const handleRepeaterUndo = (locale: string, itemId: string, innerFieldName: string, innerFieldOldValue: any) => {
        if (!onUndoField) return;

        // innerFieldOldValue is likely { value: "old" }, we extract it
        const revertedValue = innerFieldOldValue?.value !== undefined ? innerFieldOldValue.value : innerFieldOldValue;

        // Construct the new full repeater value to overwrite state

        let updatedRepeaterValue = structuredClone(newValue);

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
            if (updatedRepeaterValue[locale]) {
                updatedRepeaterValue[locale] = updateItemInArray(updatedRepeaterValue[locale]);
            }
        } else if (Array.isArray(updatedRepeaterValue)) {
            updatedRepeaterValue = updateItemInArray(updatedRepeaterValue);
        }

        // Call the main undo handler to update the repeater field with the new structure
        onUndoField({
            componentId,
            fieldName: repeaterField.name,
            oldValue: updatedRepeaterValue,
            fieldType: field.type
        });
    };

    const getItemsForLocale = (value: any, locale: string): any[] => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (isTranslationObject(value)) return value[locale] || [];
        return [];
    };

    const isRepeaterTranslatable = isTranslationObject(newValue) || isTranslationObject(oldValue);
    const localesToProcess = isRepeaterTranslatable
        ? [DEFAULT_LOCALE, ...LOCALES.filter(l => l !== DEFAULT_LOCALE)]
        : [DEFAULT_LOCALE];

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

    const getValStr = (val: any, locale: string) => {
        if (val === null || val === undefined) return '';
        if (isTranslationObject(val)) return String(val[locale] || val[DEFAULT_LOCALE] || '');
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
    };

    const localeChanges = useMemo(() => {
        const changesList: { locale: string; changes: RepeaterItemChange[] }[] = [];

        for (const locale of localesToProcess) {
            const oldItems = getItemsForLocale(oldValue, locale);
            const newItems = getItemsForLocale(newValue, locale);

            const oldItemsMap = new Map<string, { item: Record<string, any>; index: number }>();
            oldItems.forEach((item, index) => {
                if (item && item._id) oldItemsMap.set(item._id, { item, index });
            });

            const newItemsMap = new Map<string, { item: Record<string, any>; index: number }>();
            newItems.forEach((item, index) => {
                if (item && item._id) newItemsMap.set(item._id, { item, index });
            });

            const changes: RepeaterItemChange[] = [];

            newItems.forEach((newItem, index) => {
                if (!newItem) return;
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

            oldItems.forEach((oldItem, oldIndex) => {
                if (!oldItem) return;
                const itemId = oldItem._id;
                if (!itemId) return;
                if (!newItemsMap.has(itemId)) {
                    changes.push({ type: 'removed', itemId, oldItem, newIndex: -1, oldIndex });
                }
            });

            // Handle cases where an item is deleted and a new one is added in its place (different IDs but same position)
            const processedChanges: RepeaterItemChange[] = [];
            const addedMap = new Map<number, RepeaterItemChange>();
            const removedMap = new Map<number, RepeaterItemChange>();
            const modifiedChanges: RepeaterItemChange[] = [];

            changes.forEach(change => {
                if (change.type === 'added') {
                    addedMap.set(change.newIndex, change);
                } else if (change.type === 'removed') {
                    removedMap.set(change.oldIndex!, change);
                } else {
                    modifiedChanges.push(change);
                }
            });

            const allIndices = new Set([...addedMap.keys(), ...removedMap.keys()]);

            allIndices.forEach(index => {
                const added = addedMap.get(index);
                const removed = removedMap.get(index);

                if (added && removed) {
                    // Merge into modified
                    // We use the NEW item's ID because that's what exists in the current state (for undo purposes)
                    processedChanges.push({
                        type: 'modified',
                        itemId: added.itemId,
                        oldItem: removed.oldItem,
                        newItem: added.newItem,
                        newIndex: index,
                        oldIndex: removed.oldIndex
                    });
                } else {
                    if (added) processedChanges.push(added);
                    if (removed) processedChanges.push(removed);
                }
            });

            processedChanges.push(...modifiedChanges);

            processedChanges.sort((a, b) => {
                const indexA = a.type === 'removed' ? (a.oldIndex ?? 9999) : a.newIndex;
                const indexB = b.type === 'removed' ? (b.oldIndex ?? 9999) : b.newIndex;

                if (indexA === indexB) {
                    if (a.type === 'removed') return -1;
                    if (b.type === 'removed') return 1;
                }
                return indexA - indexB;
            });

            if (processedChanges.length > 0) {
                changesList.push({ locale, changes: processedChanges });
            }
        }
        return changesList;
    }, [oldValue, newValue, repeaterFields, localesToProcess]);

    // If no changes across any locale, don't render
    if (localeChanges.length === 0) return null;

    return (
        <div className="py-6 space-y-4">
            <h4 className="text-sm font-semibold text-foreground">{fieldLabel}</h4>

            {localeChanges.map(({ locale, changes }) => (
                <div key={locale} className="space-y-10">
                    {isRepeaterTranslatable && (
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {locale.toUpperCase()}
                        </div>
                    )}

                    {changes.map((change) => {
                        const item = change.newItem || change.oldItem!;
                        const displayIndex = change.type === 'removed' ? change.oldIndex! : change.newIndex;
                        const itemTitle = getItemLabel(item, displayIndex);
                        const itemPositionLabel = `${itemName} ${displayIndex + 1}`;

                        return (
                            <div
                                key={change.itemId}
                                className="space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <div className={cn(
                                        "flex items-center gap-2",
                                        change.type === 'removed' && " text-muted-foreground"
                                    )}>
                                        <span className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                            {itemPositionLabel}
                                        </span>

                                        {itemTitle !== itemPositionLabel && (
                                            <span className="text-sm font-medium">
                                                {itemTitle}
                                            </span>
                                        )}

                                        {change.type === 'added' && (
                                            <span className="text-xs text-green-600 ml-1">
                                                <PlusIcon className="size-3" />
                                            </span>
                                        )}
                                        {change.type === 'removed' && (
                                            <span className="text-xs text-red-600 ml-1">
                                                <MinusIcon className="size-3" />
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {change.type === 'modified' && change.oldItem && change.newItem && (
                                    <div className="space-y-2 pt-2 border-t">
                                        {repeaterFields.map((f: any, i: number) => {
                                            const oldFieldVal = change.oldItem![f.name];
                                            const newFieldVal = change.newItem![f.name];

                                            if (JSON.stringify(normalizeForComparison(oldFieldVal)) ===
                                                JSON.stringify(normalizeForComparison(newFieldVal))) {
                                                return null;
                                            }

                                            const fieldType = normalizeFieldType(f.type || 'text');
                                            const isTextField = ['input', 'textarea', 'text'].includes(fieldType);

                                            if (isTextField) {
                                                const oldStr = getValStr(oldFieldVal, locale);
                                                const newStr = getValStr(newFieldVal, locale);

                                                return (
                                                    <div key={i} className="flex gap-2 items-baseline text-sm">
                                                        <span className="text-muted-foreground whitespace-nowrap">
                                                            {f.label || f.name}:
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <LexicalCMSField
                                                                value={newStr}
                                                                onChange={() => { }}
                                                                multiline={fieldType !== 'input'}
                                                                unstyled={true}
                                                                diffMode={true}
                                                                diffOldValue={oldStr}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // Fallback for non-text fields (images, colors, etc.)
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
                                                    onRecoverField={onRecoverField}
                                                    pageName={pageName}
                                                />
                                            );
                                        })}
                                    </div>
                                )}

                                {change.type === 'added' && change.newItem && (
                                    <div className="space-y-2 pt-2 border-t text-sm">
                                        {repeaterFields.map((f: any, i: number) => {
                                            const newFieldVal = change.newItem![f.name];
                                            if (newFieldVal === undefined || newFieldVal === null || newFieldVal === '') return null;

                                            const fieldType = normalizeFieldType(f.type || 'text');
                                            const isTextField = ['input', 'textarea', 'text'].includes(fieldType);

                                            if (isTextField) {
                                                const newStr = getValStr(newFieldVal, locale);

                                                return (
                                                    <div key={i} className="flex gap-2 items-baseline text-sm">
                                                        <span className="text-muted-foreground whitespace-nowrap">
                                                            {f.label || f.name}:
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <LexicalCMSField
                                                                value={newStr}
                                                                onChange={() => { }}
                                                                multiline={fieldType !== 'input'}
                                                                unstyled={true}
                                                                diffMode={true}
                                                                diffOldValue=""
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // Fallback for non-text fields
                                            const miniNewData = { [f.name]: { value: newFieldVal } };

                                            return (
                                                <FieldDiffRenderer
                                                    key={i}
                                                    field={f}
                                                    oldData={null}
                                                    newData={miniNewData}
                                                    componentId={componentId}
                                                    onRecoverField={onRecoverField}
                                                    pageName={pageName}
                                                />
                                            );
                                        })}
                                    </div>
                                )}

                                {change.type === 'removed' && change.oldItem && (
                                    <div className="space-y-2 pt-2 border-t text-sm">
                                        {repeaterFields.map((f: any, i: number) => {
                                            const oldFieldVal = change.oldItem![f.name];
                                            if (oldFieldVal === undefined || oldFieldVal === null || oldFieldVal === '') return null;

                                            const fieldType = normalizeFieldType(f.type || 'text');
                                            const isTextField = ['input', 'textarea', 'text'].includes(fieldType);

                                            if (isTextField) {
                                                const oldStr = getValStr(oldFieldVal, locale);

                                                return (
                                                    <div key={i} className="flex gap-2 items-baseline text-sm">
                                                        <span className="text-muted-foreground whitespace-nowrap">
                                                            {f.label || f.name}:
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <LexicalCMSField
                                                                value=""
                                                                onChange={() => { }}
                                                                multiline={fieldType !== 'input'}
                                                                unstyled={true}
                                                                diffMode={true}
                                                                diffOldValue={oldStr}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // Fallback for non-text fields
                                            const miniOldData = { [f.name]: { value: oldFieldVal } };
                                            const miniNewData = { [f.name]: { value: undefined } };

                                            return (
                                                <FieldDiffRenderer
                                                    key={i}
                                                    field={f}
                                                    oldData={miniOldData}
                                                    newData={miniNewData}
                                                    componentId={componentId}
                                                    onRecoverField={onRecoverField}
                                                    pageName={pageName}
                                                />
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
