import React, { useState, useEffect } from 'react';
import type { ComponentData, Field } from '@/lib/form-builder';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getFieldComponent } from '@/lib/form-builder/fields/FieldRegistry';

interface InlineComponentFormProps {
    component: ComponentData;
    fields: Field[];
    onDataChange: (componentId: string, data: Record<string, any>) => void;
    onDelete: () => void;
}

export const InlineComponentForm: React.FC<InlineComponentFormProps> = ({
    component,
    fields,
    onDataChange,
    onDelete
}) => {
    const [formData, setFormData] = useState<Record<string, any>>(() => {
        const initial: Record<string, any> = {};
        fields.forEach(field => {
            initial[field.name] = component.data[field.name]?.value ?? field.defaultValue ?? '';
        });
        return initial;
    });

    // Update parent when form data changes
    useEffect(() => {
        onDataChange(component.id, formData);
    }, [formData, component.id, onDataChange]);

    const handleChange = (fieldName: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
    };

    return (
        <Card className="p-4">
            <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-lg">{component.schemaName}</h3>
                <Button variant="destructive" size="sm" onClick={onDelete}>
                    Delete
                </Button>
            </div>

            <div className="space-y-4">
                {fields.map(field => {
                    const FieldComponent = getFieldComponent(field.type);

                    if (!FieldComponent) {
                        console.warn(`No component registered for field type: ${field.type}`);
                        return null;
                    }

                    return (
                        <FieldComponent
                            key={field.name}
                            field={field}
                            value={formData[field.name]}
                            onChange={(value) => handleChange(field.name, value)}
                        />
                    );
                })}
            </div>
        </Card>
    );
};