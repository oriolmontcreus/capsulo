import React from 'react';
import type { TextareaField as TextareaFieldType } from './textarea.types';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';

interface TextareaFieldProps {
  field: TextareaFieldType;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

export const TextareaField: React.FC<TextareaFieldProps> = ({ field, value, onChange, error }) => {
  const textValue = value || '';

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={field.name} required={field.required}>
        {field.label || field.name}
      </FieldLabel>
      <Textarea
        id={field.name}
        value={textValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        required={field.required}
        rows={field.rows || 3}
        minLength={field.minLength}
        maxLength={field.maxLength}
        aria-invalid={!!error}
      />
      {field.description && field.maxLength ? (
        <FieldDescription className="flex justify-between items-center">
          <span>{field.description}</span>
          <span className="text-xs whitespace-nowrap">
            {textValue.length} / {field.maxLength}
          </span>
        </FieldDescription>
      ) : field.description ? (
        <FieldDescription>{field.description}</FieldDescription>
      ) : field.maxLength ? (
        <div className="text-xs text-muted-foreground text-right whitespace-nowrap">
          {textValue.length} / {field.maxLength}
        </div>
      ) : null}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
};
