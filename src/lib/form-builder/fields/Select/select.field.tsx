import React from 'react';
import type { SelectField as SelectFieldType } from './select.types';
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SelectFieldProps {
  field: SelectFieldType;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({ field, value, onChange, error }) => (
  <Field data-invalid={!!error}>
    <FieldLabel htmlFor={field.name}>
      {field.label || field.name}
      {field.required && <span className="text-red-500/80 ml-1">*</span>}
    </FieldLabel>
    <Select value={value || ''} onValueChange={onChange} required={field.required}>
      <SelectTrigger id={field.name} aria-invalid={!!error}>
        <SelectValue placeholder={field.placeholder || 'Select an option'} />
      </SelectTrigger>
      <SelectContent>
        {field.options.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {field.description && (
      <FieldDescription>{field.description}</FieldDescription>
    )}
    {error && <FieldError>{error}</FieldError>}
  </Field>
);
