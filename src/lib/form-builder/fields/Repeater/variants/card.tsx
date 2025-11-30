import React, { useCallback } from 'react';
import type { RepeaterField as RepeaterFieldType } from '../repeater.types';
import { FieldRenderer } from '../../../core/FieldRenderer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { FieldLabel } from '../../../components/FieldLabel';
import type { Field } from '../../../core/types';
import { useConfirm } from '@/hooks/useConfirm';
import { ConfirmPopover } from '@/components/ui/confirm-popover';

interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

interface RepeaterItemProps {
    item: any;
    itemId: string;
    index: number;
    field: RepeaterFieldType;
    onRemove: (itemId: string) => void;
    onChange: (itemId: string, childField: Field, update: any) => void;
    fieldErrors?: Record<string, string>;
    fieldPath?: string;
    componentData?: ComponentData;
    formData?: Record<string, any>;
}

const RepeaterItem = React.memo(({
    item,
    itemId,
    index,
    field,
    onRemove,
    onChange,
    fieldErrors,
    fieldPath,
    componentData,
    formData
}: RepeaterItemProps) => {
    const { shouldConfirm, popoverProps } = useConfirm('deleteRepeaterItem', () => onRemove(itemId), {
        title: `Delete ${field.itemName || 'item'}`,
        description: `Are you sure you want to delete this ${field.itemName || 'item'}?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        side: 'left',
    });

    return (
        <Card className="relative group bg-transparent shadow-none">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <span className="text-sm font-medium text-muted-foreground">{field.itemName || 'Item'} {index + 1}</span>
                {shouldConfirm ? (
                    <ConfirmPopover {...popoverProps}>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${field.itemName || 'item'} ${index + 1}`}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                            <Trash2 size={16} />
                        </Button>
                    </ConfirmPopover>
                ) : (
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${field.itemName || 'item'} ${index + 1}`}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemove(itemId)}
                    >
                        <Trash2 size={16} />
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {field.fields.map((childField, fieldIndex) => {
                    const childFieldName = 'name' in childField ? childField.name : `field-${fieldIndex}`;
                    const itemFieldPath = fieldPath ? `${fieldPath}.${index}.${childFieldName}` : `${field.name}.${index}.${childFieldName}`;
                    const childValue = 'name' in childField ? item[childField.name] : item;
                    const childError = fieldErrors ? fieldErrors[itemFieldPath] : undefined;

                    return (
                        <FieldRenderer
                            key={fieldIndex}
                            field={childField}
                            value={childValue}
                            onChange={(update) => onChange(itemId, childField, update)}
                            error={childError}
                            fieldErrors={fieldErrors}
                            fieldPath={itemFieldPath}
                            componentData={componentData}
                            formData={formData}
                        />
                    );
                })}
            </CardContent>
        </Card>
    );
});

interface CardVariantProps {
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

export const CardVariant: React.FC<CardVariantProps> = ({
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
    // Ensure all items have a unique _id field
    const items = React.useMemo(() => {
        const rawItems = Array.isArray(value) ? value : [];
        return rawItems.map(item => {
            // If item doesn't have an _id, assign one
            if (typeof item === 'object' && item !== null && !item._id) {
                return { ...item, _id: generateItemId() };
            }
            return item;
        });
    }, [value, generateItemId]);

    const itemsRef = React.useRef(items);
    itemsRef.current = items;

    const handleAddItem = useCallback(() => {
        const newItem = { _id: generateItemId() };
        onChange([...itemsRef.current, newItem]);
    }, [onChange, generateItemId]);

    const handleRemoveItem = useCallback((itemId: string) => {
        const newItems = itemsRef.current.filter(item => item._id !== itemId);
        onChange(newItems);
    }, [onChange]);

    const handleChildChange = useCallback((itemId: string, childField: Field, update: any) => {
        const newItems = itemsRef.current.map(item => {
            if (item._id !== itemId) return item;

            const currentItem = item || {};
            if ('name' in childField) {
                return { ...currentItem, [childField.name]: update };
            } else {
                return { ...currentItem, ...update };
            }
        });

        onChange(newItems);
    }, [onChange]);

    return (
        <div className="space-y-4">
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
                <div className="text-sm text-muted-foreground mb-2">{field.description}</div>
            )}

            <div className="space-y-4">
                {items.map((item, index) => (
                    <RepeaterItem
                        key={item._id}
                        item={item}
                        itemId={item._id}
                        index={index}
                        field={field}
                        onRemove={handleRemoveItem}
                        onChange={handleChildChange}
                        fieldErrors={fieldErrors}
                        fieldPath={fieldPath}
                        componentData={componentData}
                        formData={formData}
                    />
                ))}
            </div>

            <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-dashed"
                onClick={handleAddItem}
            >
                <Plus size={16} className="mr-2" />
                Add {field.itemName || 'Item'}
            </Button>

            {error && <div className="text-sm text-destructive mt-2">{error}</div>}
        </div>
    );
};

