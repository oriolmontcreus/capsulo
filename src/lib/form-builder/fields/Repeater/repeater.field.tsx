import React, { useCallback } from 'react';
import type { RepeaterField as RepeaterFieldType } from './repeater.types';
import { FieldRenderer } from '../../core/FieldRenderer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { FieldLabel } from '../../components/FieldLabel';
import { cn } from '@/lib/utils';
import type { Field } from '../../core/types';

interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

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
        // Initialize default values if any (optional optimization)
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
            // It's a data field, update is the value
            newItems[index] = { ...currentItem, [childField.name]: update };
        } else {
            // It's a layout, update is a partial object
            newItems[index] = { ...currentItem, ...update };
        }

        onChange(newItems);
    }, [onChange]);

    return (
        <div className="space-y-4">
            <FieldLabel
                htmlFor={field.name}
                required={false} // Repeater itself usually isn't "required" in the HTML sense, but minItems might enforce it
                fieldPath={fieldPath}
                translatable={false} // Repeater structure usually isn't translatable, content inside is
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
                    <Card key={index} className="relative group">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                            <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemoveItem(index)}
                            >
                                <Trash2 size={16} />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {field.fields.map((childField, fieldIndex) => {
                                // Determine field path for validation/errors
                                const childFieldName = 'name' in childField ? childField.name : `field-${fieldIndex}`;
                                const itemFieldPath = fieldPath ? `${fieldPath}.${index}.${childFieldName}` : `${field.name}.${index}.${childFieldName}`;

                                // Get value
                                const childValue = 'name' in childField ? item[childField.name] : item;

                                const childError = fieldErrors ? fieldErrors[itemFieldPath] : undefined;

                                return (
                                    <FieldRenderer
                                        key={fieldIndex}
                                        field={childField}
                                        value={childValue}
                                        onChange={(update) => handleChildChange(index, childField, update)}
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
