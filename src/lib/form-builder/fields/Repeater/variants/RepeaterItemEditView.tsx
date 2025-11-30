import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FieldRenderer } from '../../../core/FieldRenderer';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { useRepeaterEdit } from '../../../context/RepeaterEditContext';
import type { Field } from '../../../core/types';

export const RepeaterItemEditView: React.FC = () => {
    const { editState, closeEdit, navigateToItem, updateItems } = useRepeaterEdit();
    const [itemData, setItemData] = useState<any>({});

    if (!editState?.isOpen || !editState.field || !editState.items) {
        return null;
    }

    const { field, items, onSave, fieldErrors, fieldPath, componentData, formData } = editState;
    const currentItemIndex = editState.itemIndex ?? 0;

    // Update item data when index changes or items change
    useEffect(() => {
        if (items[currentItemIndex]) {
            setItemData({ ...items[currentItemIndex] });
        } else {
            // If item doesn't exist yet (new item), start with empty object
            setItemData({});
        }
    }, [currentItemIndex, items]);

    const handleFieldChange = useCallback((childField: Field, update: any) => {
        setItemData((prev: any) => {
            if ('name' in childField) {
                return { ...prev, [childField.name]: update };
            } else {
                return { ...prev, ...update };
            }
        });
    }, []);

    const handleSave = useCallback(() => {
        if (onSave) {
            // Save the item - this will update the parent component's state
            onSave(currentItemIndex, itemData);
            // Small delay to ensure state update propagates before closing
            // This ensures the table re-renders with the new data
            setTimeout(() => {
                closeEdit();
            }, 0);
        } else {
            closeEdit();
        }
    }, [currentItemIndex, itemData, onSave, closeEdit]);

    const handleNavigate = useCallback((direction: 'prev' | 'next') => {
        const newIndex = direction === 'prev' ? currentItemIndex - 1 : currentItemIndex + 1;
        if (newIndex >= 0 && newIndex < items.length) {
            // Save current item before navigating
            if (onSave) {
                onSave(currentItemIndex, itemData);
            }
            navigateToItem(newIndex);
        }
    }, [currentItemIndex, items.length, itemData, onSave, navigateToItem]);

    const canNavigatePrev = currentItemIndex > 0;
    const canNavigateNext = currentItemIndex < items.length - 1;
    const itemNumber = currentItemIndex + 1;
    const totalItems = items.length;

    return (
        <div className="flex flex-col h-full">
            <header className="bg-background sticky top-0 flex shrink-0 items-center gap-4 border-b p-4 z-10">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeEdit}
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

            <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4 max-w-4xl mx-auto">
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
                </div>
            </div>

            <footer className="bg-background sticky bottom-0 flex shrink-0 items-center justify-end gap-2 border-t p-4">
                <Button variant="outline" onClick={closeEdit}>
                    Cancel
                </Button>
                <Button onClick={handleSave}>
                    Save
                </Button>
            </footer>
        </div>
    );
};

