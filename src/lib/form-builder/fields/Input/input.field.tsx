import React from 'react';
import type { InputField as InputFieldType } from './input.types';
import { Input as InputUI } from '@/components/ui/input';
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';

interface InputFieldProps {
  field: InputFieldType;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

export const InputField: React.FC<InputFieldProps> = ({ field, value, onChange, error }) => (
  <Field data-invalid={!!error}>
    <FieldLabel htmlFor={field.name}>
      {field.label || field.name}
      {field.required && <span className="text-red-500/80 ml-1">*</span>}
    </FieldLabel>
    <InputUI
      id={field.name}
      type={field.inputType || 'text'}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      required={field.required}
      aria-invalid={!!error}
    />
    {field.description && (
      <FieldDescription>{field.description}</FieldDescription>
    )}
    {error && <FieldError>{error}</FieldError>}
  </Field>
);


