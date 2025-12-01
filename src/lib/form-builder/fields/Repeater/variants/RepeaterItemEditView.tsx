import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FieldRenderer } from '../../../core/FieldRenderer';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { FieldGroup } from '@/components/ui/field';
import { useRepeaterEdit } from '../../../context/RepeaterEditContext';
import type { Field } from '../../../core/types';

export const RepeaterItemEditView: React.FC = () => {
    const { editState, closeEdit, navigateToItem, updateItems } = useRepeaterEdit();
    const [itemData, setItemData] = useState<any>({});
    const saveTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    if (!editState?.isOpen || !editState.field || !editState.items) {
        return null;
    }

    const { field, items, onSave, fieldErrors, fieldPath, componentData, formData } = editState;
    const currentItemIndex = editState.itemIndex ?? 0;
    const itemDataRef = useRef(itemData);

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
            if (saveTimerRef.current && onSave) {
                clearTimeout(saveTimerRef.current);
                saveTimerRef.current = null;
                // Use the ref to get the latest data, and the captured index from the effect scope
                onSave(currentItemIndex, itemDataRef.current);
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
            if (onSave) {
                // Clear any existing timer
                if (saveTimerRef.current) {
                    clearTimeout(saveTimerRef.current);
                }

                // Set new timer to save after 700ms of inactivity
                saveTimerRef.current = setTimeout(() => {
                    onSave(currentItemIndex, newData);
                    saveTimerRef.current = null;
                }, 700);
            }

            return newData;
        });
    }, [onSave, currentItemIndex]);

    // Flush any pending save immediately
    const flushPendingSave = useCallback(() => {
        if (saveTimerRef.current && onSave) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
            onSave(currentItemIndex, itemData);
        }
    }, [onSave, currentItemIndex, itemData]);

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
            <div className="flex-1 overflow-y-auto py-6">
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
