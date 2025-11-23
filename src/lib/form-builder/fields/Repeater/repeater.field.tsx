import React, { useCallback } from 'react';
import type { RepeaterField as RepeaterFieldType } from './repeater.types';
import { FieldRenderer } from '../../core/FieldRenderer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { FieldLabel } from '../../components/FieldLabel';
import { cn } from '@/lib/utils';
import type { Field } from '../../core/types';
import { useConfirm } from '@/hooks/useConfirm';
import { ConfirmPopover } from '@/components/ui/confirm-popover';

interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

interface RepeaterItemProps {
    item: any;
    index: number;
    field: RepeaterFieldType;
    onRemove: (index: number) => void;
    onChange: (index: number, childField: Field, update: any) => void;
    fieldErrors?: Record<string, string>;
    fieldPath?: string;
    componentData?: ComponentData;
    formData?: Record<string, any>;
}

const RepeaterItem = React.memo(({
    item,
    index,
    field,
    onRemove,
    onChange,
    fieldErrors,
    fieldPath,
    componentData,
    formData
}: RepeaterItemProps) => {
    const { shouldConfirm, popoverProps } = useConfirm('deleteRepeaterItem', () => onRemove(index), {
        title: 'Delete item',
        description: 'Are you sure you want to delete this item?',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        side: 'left',
    });

    return (
        <Card className="relative group">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                {shouldConfirm ? (
                    <ConfirmPopover {...popoverProps}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                            <Trash2 size={16} />
                        </Button>
                    </ConfirmPopover>
                ) : (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemove(index)}
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
                            onChange={(update) => onChange(index, childField, update)}
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

interface RepeaterFieldProps {
    field: RepeaterFieldType;
    value: any[];
    onChange: (value: any[]) => void;
    error?: string;
    fieldErrors?: Record<string, string>;
    fieldPath?: string;
    componentData?: ComponentData;
    formData?: Record<string, any>;
}

export const RepeaterField: React.FC<RepeaterFieldProps> = ({
    field,
    value = [],
    onChange,
    error,
    fieldErrors,
    fieldPath,
    componentData,
    formData,
}) => {
    const items = Array.isArray(value) ? value : [];
    const itemsRef = React.useRef(items);
    itemsRef.current = items;

    const handleAddItem = useCallback(() => {
        const newItem = {};
        onChange([...itemsRef.current, newItem]);
    }, [onChange]);

    const handleRemoveItem = useCallback((index: number) => {
        const newItems = [...itemsRef.current];
        newItems.splice(index, 1);
        onChange(newItems);
    }, [onChange]);

    const handleChildChange = useCallback((index: number, childField: Field, update: any) => {
        const newItems = [...itemsRef.current];
        const currentItem = newItems[index] || {};

        if ('name' in childField) {
            newItems[index] = { ...currentItem, [childField.name]: update };
        } else {
            newItems[index] = { ...currentItem, ...update };
        }

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
                        key={index}
                        item={item}
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
                Add Item
            </Button>

            {error && <div className="text-sm text-destructive mt-2">{error}</div>}
        </div>
    );
};
