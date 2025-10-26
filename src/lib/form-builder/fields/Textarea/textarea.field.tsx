import React from 'react';
import type { TextareaField as TextareaFieldType } from './textarea.types';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';
import { cn } from '@/lib/utils';

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
      <div className="flex justify-between items-center">
        <FieldLabel htmlFor={field.name} required={field.required}>
          {field.label || field.name}
        </FieldLabel>
        {field.maxLength && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {textValue.length} / {field.maxLength}
          </span>
        )}
      </div>
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
        className={cn(error && "border-destructive")}
      />
      {error ? (
        <FieldError>{error}</FieldError>
      ) : field.description ? (
        <FieldDescription>{field.description}</FieldDescription>
      ) : null}
    </Field>
  );
};
