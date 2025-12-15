import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FieldRenderer } from '../../../core/FieldRenderer';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { FieldGroup } from '@/components/ui/field';
import { useRepeaterEdit } from '../../../context/RepeaterEditContext';
import type { Field } from '../../../core/types';
import type { RepeaterField } from '../repeater.types';

interface RepeaterItemEditViewContentProps {
    field: RepeaterField;
    items: any[];
    onSave?: (index: number, data: any) => void;
    fieldErrors?: Record<string, string>;
    fieldPath?: string;
    componentData?: any;
    formData?: any;
    currentItemIndex: number;
    closeEdit: () => void;
    navigateToItem: (index: number) => void;
}

const RepeaterItemEditViewContent: React.FC<RepeaterItemEditViewContentProps> = ({
    field,
    items,
    onSave,
    fieldErrors,
    fieldPath,
    componentData,
    formData,
    currentItemIndex,
    closeEdit,
    navigateToItem,
}) => {
    const [itemData, setItemData] = useState<any>({});
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const itemDataRef = useRef(itemData);
    const onSaveRef = useRef(onSave);
    const currentItemIndexRef = useRef(currentItemIndex);

    // Update refs when props change
    useEffect(() => {
        onSaveRef.current = onSave;
        currentItemIndexRef.current = currentItemIndex;
    }, [onSave, currentItemIndex]);

    // Update item data when index changes or items change
    useEffect(() => {
        if (items[currentItemIndex]) {
            const newData = { ...items[currentItemIndex] };
            setItemData(newData);
            itemDataRef.current = newData;
        } else {
            // If item doesn't exist yet (new item), start with empty object
            const newData = {};
            setItemData(newData);
            itemDataRef.current = newData;
        }
    }, [currentItemIndex, items]);

    // Keep ref in sync
    useEffect(() => {
        itemDataRef.current = itemData;
    }, [itemData]);

    // Cleanup timer on unmount or index change - FLUSH PENDING SAVE
    useEffect(() => {
        return () => {
            if (saveTimerRef.current && onSaveRef.current) {
                clearTimeout(saveTimerRef.current);
                saveTimerRef.current = null;
                // Use refs to get the latest values
                onSaveRef.current(currentItemIndexRef.current, itemDataRef.current);
            }
        };
    }, [currentItemIndex, onSave]);

    const handleFieldChange = useCallback((childField: Field, update: any) => {
        setItemData((prev: any) => {
            const newData = 'name' in childField
                ? { ...prev, [childField.name]: update }
                : { ...prev, ...update };

            itemDataRef.current = newData;

            // Debounced auto-save: wait 700ms after last change before saving
            if (onSaveRef.current) {
                // Clear any existing timer
                if (saveTimerRef.current) {
                    clearTimeout(saveTimerRef.current);
                }

                // Set new timer to save after 700ms of inactivity
                saveTimerRef.current = setTimeout(() => {
                    if (onSaveRef.current) {
                        onSaveRef.current(currentItemIndexRef.current, newData);
                    }
                    saveTimerRef.current = null;
                }, 700);
            }

            return newData;
        });
    }, []);

    // Flush any pending save immediately
    const flushPendingSave = useCallback(() => {
        if (saveTimerRef.current && onSaveRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
            onSaveRef.current(currentItemIndexRef.current, itemDataRef.current);
        }
    }, []);

    const handleNavigate = useCallback((direction: 'prev' | 'next') => {
        // Save current changes before navigating
        flushPendingSave();

        const newIndex = direction === 'prev' ? currentItemIndex - 1 : currentItemIndex + 1;
        if (newIndex >= 0 && newIndex < items.length) {
            navigateToItem(newIndex);
        }
    }, [currentItemIndex, items.length, navigateToItem, flushPendingSave]);

    const handleClose = useCallback(() => {
        // Save current changes before closing
        flushPendingSave();
        closeEdit();
    }, [flushPendingSave, closeEdit]);

    const canNavigatePrev = currentItemIndex > 0;
    const canNavigateNext = currentItemIndex < items.length - 1;
    const itemNumber = currentItemIndex + 1;
    const totalItems = items.length;

    return (
        <div className="flex flex-col h-full">
            <header className="bg-background sticky top-0 flex shrink-0 items-center gap-4 border-b py-4 z-10">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    aria-label="Back"
                >
                    <ArrowLeft size={16} />
                </Button>
                <div className="flex items-center justify-between flex-1">
                    <h1 className="text-lg font-semibold">
                        {field.itemName || 'Item'} {itemNumber} of {totalItems}
                    </h1>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleNavigate('prev')}
                            disabled={!canNavigatePrev}
                            aria-label="Previous item"
                        >
                            <ChevronLeft size={16} />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleNavigate('next')}
                            disabled={!canNavigateNext}
                            aria-label="Next item"
                        >
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto py-8">
                <FieldGroup className="pl-1">
                    {field.fields.map((childField: Field, fieldIndex: number) => {
                        const childFieldName = 'name' in childField ? childField.name : `field-${fieldIndex}`;
                        const itemFieldPath = fieldPath ? `${fieldPath}.${currentItemIndex}.${childFieldName}` : `${field.name}.${currentItemIndex}.${childFieldName}`;
                        const childValue = 'name' in childField ? itemData[childField.name] : itemData;
                        const childError = fieldErrors ? fieldErrors[itemFieldPath] : undefined;

                        return (
                            <FieldRenderer
                                key={fieldIndex}
                                field={childField}
                                value={childValue}
                                onChange={(update) => handleFieldChange(childField, update)}
                                error={childError}
                                fieldErrors={fieldErrors}
                                fieldPath={itemFieldPath}
                                componentData={componentData}
                                formData={formData}
                            />
                        );
                    })}
                </FieldGroup>
            </div>
        </div>
    );
};

export const RepeaterItemEditView: React.FC<{ externalErrors?: Record<string, string> }> = ({ externalErrors }) => {
    const { editState, closeEdit, navigateToItem } = useRepeaterEdit();

    if (!editState?.isOpen || !editState.field || !editState.items) {
        return null;
    }

    const { field, items, onSave, fieldErrors, fieldPath, componentData, formData } = editState;
    const currentItemIndex = editState.itemIndex ?? 0;

    // Merge context errors with external validation errors (external takes precedence)
    const mergedErrors = { ...fieldErrors, ...externalErrors };

    return (
        <RepeaterItemEditViewContent
            field={field}
            items={items}
            onSave={onSave}
            fieldErrors={mergedErrors}
            fieldPath={fieldPath}
            componentData={componentData}
            formData={formData}
            currentItemIndex={currentItemIndex}
            closeEdit={closeEdit}
            navigateToItem={navigateToItem}
        />
    );
};
