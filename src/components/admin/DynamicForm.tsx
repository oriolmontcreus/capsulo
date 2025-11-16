import React, { useState, useCallback } from 'react';
import type { Field } from '@/lib/form-builder';
import { flattenFields } from '@/lib/form-builder/core/fieldHelpers';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { FieldRenderer } from '@/lib/form-builder/core/FieldRenderer';
import { fieldToZod } from '@/lib/form-builder/fields/ZodRegistry';
import { useConfirm } from '@/hooks/useConfirm';
import { ConfirmPopover } from '@/components/ui/confirm-popover';
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
      let defaultVal = field.defaultValue;

      // Special handling for FileUpload fields
      if (field.type === 'fileUpload') {
        defaultVal = defaultVal ?? { files: [] };
      } else {
        defaultVal = defaultVal ?? '';
      }

      initial[field.name] = initialData[field.name] ?? defaultVal;
    });
    return initial;
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const { shouldConfirm, popoverProps } = useConfirm('cancelForm', onCancel, {
    title: 'Confirm action',
    description: 'Are you sure you want to cancel? Any unsaved changes will be lost.',
    confirmText: 'Cancel',
    cancelText: 'Keep editing',
    side: 'top',
  });

  const handleChange = useCallback((fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  }, []);

  const handleLayoutChange = useCallback((value: any) => {
    // When a layout changes, flatten the nested values
    setFormData(prev => ({ ...prev, ...value }));
  }, []);

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
    <Card className="p-6 bg-background">
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
                  fieldPath={`layout-${index}`}
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
                  fieldPath={field.name}
                />
              );
            }

            return null;
          })}
        </FieldGroup>
        <div className="flex gap-2 pt-4">
          <Button type="submit">
            Add
          </Button>
          {shouldConfirm ? (
            <ConfirmPopover {...popoverProps}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </ConfirmPopover>
          ) : (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
};
