import React, { useState, useCallback, useMemo } from 'react';
import type { RepeaterField as RepeaterFieldType } from '../repeater.types';
import { FieldLabel } from '../../../components/FieldLabel';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { ConfirmPopover } from '@/components/ui/confirm-popover';
import { useTranslation } from '@/lib/form-builder/context/TranslationContext';
import { useRepeaterEdit } from '../../../context/RepeaterEditContext';
import type { Field } from '../../../core/types';

interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

interface TableVariantProps {
    field: RepeaterFieldType;
    value: any[];
    onChange: (value: any[]) => void;
    error?: string;
    fieldErrors?: Record<string, string>;
    fieldPath?: string;
    componentData?: ComponentData;
    formData?: Record<string, any>;
    generateItemId: () => string;
}

// Helper function to format field value for display
const formatFieldValue = (field: Field, value: any, defaultLocale: string): string => {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    // Handle translatable fields
    if ('translatable' in field && field.translatable && typeof value === 'object' && !Array.isArray(value)) {
        // If it's a translatable object with locale keys
        if (value[defaultLocale] !== undefined) {
            value = value[defaultLocale];
        } else {
            // Try to get first available locale value
            const locales = Object.keys(value);
            if (locales.length > 0) {
                value = value[locales[0]];
            }
        }
    }

    // Handle different field types
    switch (field.type) {
        case 'textarea':
        case 'richeditor':
            // Truncate long text
            const textValue = String(value);
            return textValue.length > 50 ? textValue.substring(0, 50) + '...' : textValue;
        
        case 'fileUpload':
            if (Array.isArray(value?.files)) {
                return `${value.files.length} file(s)`;
            }
            return value?.files?.length ? '1 file' : '—';
        
        case 'select':
            if (Array.isArray(value)) {
                return value.join(', ');
            }
            return String(value);
        
        case 'switch':
            return value ? 'Yes' : 'No';
        
        case 'datefield':
            if (value) {
                try {
                    const date = new Date(value);
                    return date.toLocaleDateString();
                } catch {
                    return String(value);
                }
            }
            return '—';
        
        default:
            return String(value);
    }
};

export const TableVariant: React.FC<TableVariantProps> = ({
    field,
    value = [],
    onChange,
    error,
    fieldErrors,
    fieldPath,
    componentData,
    formData,
    generateItemId,
}) => {
    const { defaultLocale } = useTranslation();
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    // Ensure all items have a unique _id field
    // The value prop comes from formData[field.name] in InlineComponentForm
    const items = useMemo(() => {
        const rawItems = Array.isArray(value) ? value : [];
        return rawItems.map(item => {
            if (typeof item === 'object' && item !== null && !item._id) {
                return { ...item, _id: generateItemId() };
            }
            return item;
        });
    }, [value, generateItemId]);

    // Filter fields to show only those with showInTable !== false
    const visibleFields = useMemo(() => {
        return field.fields.filter(childField => {
            if ('showInTable' in childField) {
                return childField.showInTable !== false;
            }
            return true; // Default to showing if not specified
        });
    }, [field.fields]);

    const itemsRef = React.useRef(items);
    itemsRef.current = items;

    const { editState, openEdit, closeEdit, updateItems } = useRepeaterEdit();

    // Sync context items with parent value when they change
    React.useEffect(() => {
        if (editState?.isOpen && editState.fieldPath === (fieldPath || field.name)) {
            // Update context with latest items from parent
            updateItems(items);
        }
    }, [items, editState?.isOpen, editState?.fieldPath, fieldPath, field.name, updateItems]);
    
    // Also sync when edit view closes to ensure table shows latest data
    React.useEffect(() => {
        if (!editState?.isOpen && items.length > 0) {
            // Ensure ref is in sync when edit view closes
            itemsRef.current = items;
        }
    }, [editState?.isOpen, items]);

    const handleSaveItem = useCallback((index: number, updatedItem: any) => {
        // CRITICAL: When adding a new item, the props haven't updated yet, so we MUST use context items
        // Check if edit view is open for this field - if so, use context items which are up-to-date
        const isEditViewOpen = editState?.isOpen && editState.fieldPath === (fieldPath || field.name);
        const currentItems = isEditViewOpen && editState.items 
            ? editState.items 
            : items;
        
        // If we're saving a new item (index might be at the end), we need to create the array
        let newItems: any[];
        if (index >= currentItems.length) {
            // This is a new item being saved - create array with the new item
            newItems = [...currentItems];
            // Fill with empty objects if needed
            while (newItems.length <= index) {
                newItems.push({ _id: generateItemId() });
            }
            newItems[index] = { ...updatedItem, _id: newItems[index]._id };
        } else {
            // Update existing item
            newItems = currentItems.map((item, i) => {
                if (i === index) {
                    return { ...updatedItem, _id: item._id };
                }
                return item;
            });
        }
        
        // CRITICAL: Update parent component's state FIRST - this is what persists the data
        // The onChange callback updates formData in InlineComponentForm, which updates the value prop
        onChange(newItems);
        
        // Update ref and context AFTER onChange to keep everything in sync
        itemsRef.current = newItems;
        if (isEditViewOpen) {
            updateItems(newItems);
        }
    }, [onChange, updateItems, items, editState, fieldPath, field.name, generateItemId]);

    const handleAddItem = useCallback(() => {
        const newItem = { _id: generateItemId() };
        // Use current items from props, not ref
        const newItems = [...items, newItem];
        
        // Update ref immediately
        itemsRef.current = newItems;
        
        // Open edit view FIRST with newItems - this ensures context has the latest data
        const newIndex = newItems.length - 1;
        const fullFieldPath = fieldPath || field.name;
        openEdit(
            fullFieldPath,
            newIndex,
            field.name,
            field.itemName || 'Item',
            newItems.length,
            field,
            newItems, // Pass the newItems array to context - CRITICAL for save to work
            handleSaveItem,
            fieldErrors,
            componentData,
            formData
        );
        
        // CRITICAL: Update parent state AFTER opening edit view
        // This ensures context has the items, and then we update the parent
        onChange(newItems);
    }, [onChange, generateItemId, fieldPath, field.name, field.itemName, openEdit, field, handleSaveItem, fieldErrors, componentData, formData, items]);

    const handleRemoveItem = useCallback((itemId: string) => {
        const newItems = itemsRef.current.filter(item => item._id !== itemId);
        onChange(newItems);
        setSelectedItems(prev => {
            const next = new Set(prev);
            next.delete(itemId);
            return next;
        });
    }, [onChange]);

    const handleBulkDelete = useCallback(() => {
        const newItems = itemsRef.current.filter(item => !selectedItems.has(item._id));
        onChange(newItems);
        setSelectedItems(new Set());
    }, [selectedItems, onChange]);

    const handleToggleSelect = useCallback((itemId: string) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }
            return next;
        });
    }, []);

    const handleToggleSelectAll = useCallback(() => {
        if (selectedItems.size === items.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(items.map(item => item._id)));
        }
    }, [selectedItems.size, items]);

    const handleRowClick = useCallback((index: number) => {
        const fullFieldPath = fieldPath || field.name;
        openEdit(
            fullFieldPath,
            index,
            field.name,
            field.itemName || 'Item',
            items.length,
            field,
            items,
            handleSaveItem,
            fieldErrors,
            componentData,
            formData
        );
    }, [fieldPath, field.name, field.itemName, items.length, openEdit, field, items, handleSaveItem, fieldErrors, componentData, formData]);

    const allSelected = items.length > 0 && selectedItems.size === items.length;
    const someSelected = selectedItems.size > 0 && selectedItems.size < items.length;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <FieldLabel
                        htmlFor={field.name}
                        required={false}
                        fieldPath={fieldPath}
                        translatable={false}
                        componentData={componentData}
                        formData={formData}
                    >
                        {field.label || field.name}
                    </FieldLabel>
                    {field.description && (
                        <div className="text-sm text-muted-foreground mt-1">{field.description}</div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {selectedItems.size > 0 && (
                        <ConfirmPopover
                            onConfirm={handleBulkDelete}
                            title={`Delete ${selectedItems.size} ${field.itemName || 'item'}${selectedItems.size > 1 ? 's' : ''}?`}
                            description={`Are you sure you want to delete ${selectedItems.size} selected ${field.itemName || 'item'}${selectedItems.size > 1 ? 's' : ''}? This action cannot be undone.`}
                            confirmText="Delete"
                            cancelText="Cancel"
                            side="bottom"
                        >
                            <Button
                                variant="destructive"
                                size="sm"
                            >
                                <Trash2 size={16} className="mr-2" />
                                Delete {selectedItems.size}
                            </Button>
                        </ConfirmPopover>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddItem}
                    >
                        <Plus size={16} className="mr-2" />
                        Add {field.itemName || 'Item'}
                    </Button>
                </div>
            </div>

            {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No {field.itemName || 'items'} yet. Click "Add {field.itemName || 'Item'}" to create one.
                </div>
            ) : (
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={allSelected}
                                        onCheckedChange={handleToggleSelectAll}
                                        aria-label="Select all"
                                    />
                                </TableHead>
                                {visibleFields.map((childField, index) => {
                                    const fieldLabel = ('label' in childField && childField.label) 
                                        ? childField.label 
                                        : ('name' in childField ? childField.name : `Field ${index + 1}`);
                                    return (
                                        <TableHead key={index}>
                                            {fieldLabel}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item, index) => {
                                const isSelected = selectedItems.has(item._id);
                                return (
                                    <TableRow
                                        key={item._id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleRowClick(index)}
                                    >
                                        <TableCell
                                            className="w-12"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => handleToggleSelect(item._id)}
                                                aria-label={`Select ${field.itemName || 'item'} ${index + 1}`}
                                            />
                                        </TableCell>
                                        {visibleFields.map((childField, fieldIndex) => {
                                            const childFieldName = 'name' in childField ? childField.name : `field-${fieldIndex}`;
                                            const childValue = item[childFieldName];
                                            const displayValue = formatFieldValue(childField, childValue, defaultLocale);
                                            
                                            return (
                                                <TableCell key={fieldIndex}>
                                                    <div className="max-w-[200px] truncate" title={displayValue}>
                                                        {displayValue}
                                                    </div>
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {error && <div className="text-sm text-destructive mt-2">{error}</div>}
        </div>
    );
};

