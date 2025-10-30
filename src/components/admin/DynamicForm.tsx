import React, { useState, useCallback } from 'react';
import type { Field } from '@/lib/form-builder';
import { flattenFields } from '@/lib/form-builder/core/fieldHelpers';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { FieldRenderer } from '@/lib/form-builder/core/FieldRenderer';
import { fieldToZod } from '@/lib/form-builder/fields/ZodRegistry';
// Import FieldRegistry to ensure it's initialized
import '@/lib/form-builder/fields/FieldRegistry';

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
    console.log('[DynamicForm] Initial form data:', initial);
    console.log('[DynamicForm] Data fields:', dataFields.map(f => ({ name: f.name, type: f.type })));
    return initial;
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Log when field errors change
  React.useEffect(() => {
    if (Object.keys(fieldErrors).length > 0) {
      console.log('[DynamicForm] Field errors updated:', fieldErrors);
    }
  }, [fieldErrors]);

  const handleChange = useCallback((fieldName: string, value: any) => {
    console.log(`[DynamicForm] Field "${fieldName}" changed to:`, value);
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  }, []);

  const handleLayoutChange = useCallback((value: any) => {
    console.log('[DynamicForm] Layout changed, updating fields:', Object.keys(value));
    console.log('[DynamicForm] New field values:', value);
    // When a layout changes, flatten the nested values
    setFormData(prev => ({ ...prev, ...value }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    console.log('[DynamicForm] Submit triggered');
    console.log('[DynamicForm] Current formData:', formData);
    console.log('[DynamicForm] Data fields to validate:', dataFields.map(f => f.name));

    // Validate only data fields (not layouts)
    const errors: Record<string, string> = {};
    let hasErrors = false;

    dataFields.forEach(field => {
      const zodSchema = fieldToZod(field);
      const fieldValue = formData[field.name];
      console.log(`[DynamicForm] Validating field "${field.name}":`, fieldValue);

      const result = zodSchema.safeParse(fieldValue);

      if (!result.success) {
        const errorMessage = result.error.errors[0]?.message || 'Invalid value';
        errors[field.name] = errorMessage;
        hasErrors = true;
        console.log(`[DynamicForm] ❌ Validation failed for "${field.name}":`, errorMessage, result.error);
      } else {
        console.log(`[DynamicForm] ✅ Validation passed for "${field.name}"`);
      }
    });

    setFieldErrors(errors);
    console.log('[DynamicForm] All errors:', errors);
    console.log('[DynamicForm] Has errors:', hasErrors);

    // Only save if no errors
    if (!hasErrors) {
      console.log('[DynamicForm] No errors, calling onSave with:', formData);
      onSave(formData);
    } else {
      console.log('[DynamicForm] Validation failed, not saving');
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          {fields.map((field, index) => {
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
                <FieldRenderer
                  key={`layout-${index}`}
                  field={field}
                  value={layoutValue}
                  onChange={handleLayoutChange}
                  error={undefined}
                  fieldErrors={attemptedSubmit ? fieldErrors : undefined}
                />
              );
            }

            // Handle data fields
            if ('name' in field) {
              return (
                <FieldRenderer
                  key={field.name}
                  field={field}
                  value={formData[field.name]}
                  onChange={(value: any) => handleChange(field.name, value)}
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
