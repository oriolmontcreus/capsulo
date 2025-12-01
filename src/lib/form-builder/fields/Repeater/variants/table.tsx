import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { RepeaterField as RepeaterFieldType } from '../repeater.types';
import { FieldLabel } from '../../../components/FieldLabel';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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
        case 'richeditor': {
            // Truncate long text
            const textValue = String(value);
            return textValue.length > 50 ? textValue.substring(0, 50) + '...' : textValue;
        }

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

    // Pagination & Search state
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const pageSize = 10; // Default page size

    const singularLabel = field.itemName || 'Item';
    const pluralLabel = field.itemPluralName || `${singularLabel}s`;

    // Ensure all items have a unique _id field
    // The value prop comes from formData[field.name] in InlineComponentForm
    const items = useMemo(() => {
        const rawItems = Array.isArray(value) ? value : [];
        const processedItems = rawItems.map(item => {
            if (typeof item === 'object' && item !== null && !item._id) {
                return { ...item, _id: generateItemId() };
            }
            return item;
        });
        return processedItems;
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

    // Debounce search query (300ms delay)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            setCurrentPage(1); // Reset to first page when search changes
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Filter items based on search query
    const filteredItems = useMemo(() => {
        if (!debouncedSearchQuery.trim()) {
            return items;
        }

        const query = debouncedSearchQuery.toLowerCase();
        return items.filter(item => {
            // Search across all visible fields
            return visibleFields.some(childField => {
                const childFieldName = 'name' in childField ? childField.name : '';
                const childValue = item[childFieldName];
                const displayValue = formatFieldValue(childField, childValue, defaultLocale);
                return displayValue.toLowerCase().includes(query);
            });
        });
    }, [items, debouncedSearchQuery, visibleFields, defaultLocale]);

    // Paginate filtered items
    const paginationData = useMemo(() => {
        const totalItems = filteredItems.length;
        const totalPages = Math.ceil(totalItems / pageSize);
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalItems);
        const paginatedItems = filteredItems.slice(startIndex, endIndex);

        return {
            items: paginatedItems,
            totalItems,
            totalPages,
            startIndex,
            endIndex,
            currentPage,
        };
    }, [filteredItems, currentPage, pageSize]);

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
        if (selectedItems.size === filteredItems.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(filteredItems.map(item => item._id)));
        }
    }, [selectedItems.size, filteredItems]);

    const handleRowClick = useCallback((paginatedIndex: number) => {
        // Map paginated index to actual index in full items array
        const actualIndex = paginationData.startIndex + paginatedIndex;
        const fullFieldPath = fieldPath || field.name;
        openEdit(
            fullFieldPath,
            actualIndex,
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
    }, [paginationData.startIndex, fieldPath, field.name, field.itemName, items.length, openEdit, field, items, handleSaveItem, fieldErrors, componentData, formData]);

    const allSelected = filteredItems.length > 0 && selectedItems.size === filteredItems.length;
    const someSelected = selectedItems.size > 0 && selectedItems.size < filteredItems.length;

    // Pagination handlers
    const handlePreviousPage = useCallback(() => {
        setCurrentPage(prev => Math.max(1, prev - 1));
    }, []);

    const handleNextPage = useCallback(() => {
        setCurrentPage(prev => Math.min(paginationData.totalPages, prev + 1));
    }, [paginationData.totalPages]);

    const handlePageClick = useCallback((page: number) => {
        setCurrentPage(page);
    }, []);

    // Auto-navigation: if current page becomes empty after deletion, go to previous page
    useEffect(() => {
        if (currentPage > 1 && paginationData.items.length === 0 && paginationData.totalPages > 0) {
            setCurrentPage(Math.min(currentPage - 1, paginationData.totalPages));
        }
    }, [currentPage, paginationData.items.length, paginationData.totalPages]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
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
                    {/* Search Input */}
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder={`Search ${pluralLabel.toLowerCase()}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-[32px]"
                        />
                    </div>

                    {selectedItems.size > 0 && (
                        <ConfirmPopover
                            onConfirm={handleBulkDelete}
                            title={`Delete ${selectedItems.size} ${selectedItems.size > 1 ? pluralLabel : singularLabel}?`}
                            description={`Are you sure you want to delete ${selectedItems.size} selected ${selectedItems.size > 1 ? pluralLabel : singularLabel}? This action cannot be undone.`}
                            confirmText="Delete"
                            cancelText="Cancel"
                            side="bottom"
                        >
                            <Button
                                variant="destructive"
                                size="sm"
                            >
                                <Trash2 size={16} className="mr-2" />
                                Delete <span className="font-mono">{selectedItems.size}</span>
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
                        Add {singularLabel}
                    </Button>
                </div>
            </div>

            {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No {pluralLabel.toLowerCase()} yet. Click "Add {singularLabel}" to create one.
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No {pluralLabel.toLowerCase()} match your search "{debouncedSearchQuery}".
                </div>
            ) : (
                <>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12 rounded-tl-lg">
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
                                        const isLastField = index === visibleFields.length - 1;
                                        return (
                                            <TableHead key={index} className={isLastField ? 'rounded-tr-lg' : ''}>
                                                {fieldLabel}
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginationData.items.map((item, index) => {
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
                                                    aria-label={`Select ${singularLabel} ${paginationData.startIndex + index + 1}`}
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

                    {/* Pagination Controls */}
                    {paginationData.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-muted-foreground">
                                Showing {paginationData.startIndex + 1}-{paginationData.endIndex} of {paginationData.totalItems} {pluralLabel.toLowerCase()}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handlePreviousPage}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft size={16} />
                                </Button>

                                {/* Page numbers */}
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, paginationData.totalPages) }, (_, i) => {
                                        let pageNum: number;

                                        // Show pages around current page
                                        if (paginationData.totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= paginationData.totalPages - 2) {
                                            pageNum = paginationData.totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }

                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={currentPage === pageNum ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => handlePageClick(pageNum)}
                                                className="w-9 h-[32px] p-0"
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    })}
                                    {paginationData.totalPages > 5 && currentPage < paginationData.totalPages - 2 && (
                                        <>
                                            <span className="text-muted-foreground px-1">...</span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePageClick(paginationData.totalPages)}
                                                className="w-9 h-9 p-0"
                                            >
                                                {paginationData.totalPages}
                                            </Button>
                                        </>
                                    )}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleNextPage}
                                    disabled={currentPage === paginationData.totalPages}
                                >
                                    <ChevronRight size={16} />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {error && <div className="text-sm text-destructive mt-2">{error}</div>}
        </div>
    );
};

