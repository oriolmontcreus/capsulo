import React, { useState } from 'react';
import type { Field } from '@/lib/form-builder';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getFieldComponent } from '@/lib/form-builder/fields/FieldRegistry';

interface DynamicFormProps {
  fields: Field[];
  initialData?: Record<string, any>;
  onSave: (data: Record<string, any>) => void;
  onCancel: () => void;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({ fields, initialData = {}, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    fields.forEach(field => {
      initial[field.name] = initialData[field.name] ?? field.defaultValue ?? '';
    });
    return initial;
  });

  const handleChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
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
        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={false}>Save to Draft</Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
};
