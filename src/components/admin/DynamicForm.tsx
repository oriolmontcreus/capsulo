import React, { useState } from 'react';
import type { Field } from '@/lib/form-builder';
import { flattenFields } from '@/lib/form-builder/core/fieldHelpers';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { getFieldComponent } from '@/lib/form-builder/fields/FieldRegistry';
import { fieldToZod } from '@/lib/form-builder/fields/ZodRegistry';

interface DynamicFormProps {
  fields: Field[];
  initialData?: Record<string, any>;
  onSave: (data: Record<string, any>) => void;
  onCancel: () => void;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({ fields, initialData = {}, onSave, onCancel }) => {
  // Only initialize data fields (layouts don't store data)
  const dataFields = flattenFields(fields);

  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    dataFields.forEach(field => {
      initial[field.name] = initialData[field.name] ?? field.defaultValue ?? '';
    });
    return initial;
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const handleChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleLayoutChange = (value: any) => {
    // When a layout changes, flatten the nested values
    setFormData(prev => ({ ...prev, ...value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    // Validate only data fields (not layouts)
    const errors: Record<string, string> = {};
    let hasErrors = false;

    dataFields.forEach(field => {
      const zodSchema = fieldToZod(field);
      const result = zodSchema.safeParse(formData[field.name]);

      if (!result.success) {
        const errorMessage = result.error.errors[0]?.message || 'Invalid value';
        errors[field.name] = errorMessage;
        hasErrors = true;
      }
    });

    setFieldErrors(errors);

    // Only save if no errors
    if (!hasErrors) onSave(formData);
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          {fields.map((field, index) => {
            const FieldComponent = getFieldComponent(field.type);

            if (!FieldComponent) {
              console.warn(`No component registered for field type: ${field.type}`);
              return null;
            }

            // Handle layouts (Grid, Tabs)
            if (field.type === 'grid' || field.type === 'tabs') {
              // Reuse flattenFields to get all nested data fields
              const nestedDataFields = flattenFields([field]);

              // Map field names to their current values
              const layoutValue: Record<string, any> = {};
              nestedDataFields.forEach(dataField => {
                layoutValue[dataField.name] = formData[dataField.name];
              });

              return (
                <FieldComponent
                  key={`layout-${index}`}
                  field={field}
                  value={layoutValue}
                  onChange={handleLayoutChange}
                  error={undefined}
                />
              );
            }

            // Handle data fields
            if ('name' in field) {
              return (
                <FieldComponent
                  key={field.name}
                  field={field}
                  value={formData[field.name]}
                  onChange={(value) => handleChange(field.name, value)}
                  error={attemptedSubmit ? fieldErrors[field.name] : undefined}
                />
              );
            }

            return null;
          })}
        </FieldGroup>
        <div className="flex gap-2 pt-4">
          <Button type="submit">
            Save to Draft
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
};
