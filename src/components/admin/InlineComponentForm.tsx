import React, { useState, useEffect } from 'react';
import type { ComponentData, Field } from '@/lib/form-builder';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
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
        <div id={`component-${component.id}`} className="py-8 border-b border-border/30 last:border-b-0">
            <div className="flex justify-between items-start mb-8">
                <h3 className="font-medium text-xl text-foreground/90">{component.schemaName}</h3>
                <Button variant="destructive" size="sm" onClick={onDelete} className="opacity-75 hover:opacity-100">
                    Delete
                </Button>
            </div>

            <FieldGroup className="pl-1">
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
            </FieldGroup>
        </div>
    );
};