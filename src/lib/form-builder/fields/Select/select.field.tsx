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
import { cn } from '@/lib/utils';

interface SelectFieldProps {
  field: SelectFieldType;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

export const SelectField: React.FC<SelectFieldProps> = React.memo(({ field, value, onChange, error }) => (
  <Field data-invalid={!!error}>
    <FieldLabel htmlFor={field.name} required={field.required}>
      {field.label || field.name}
    </FieldLabel>
    <Select value={value || ''} onValueChange={onChange} required={field.required}>
      <SelectTrigger
        id={field.name}
        aria-invalid={!!error}
        className={cn(error && "border-destructive")}
      >
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
    {/* Error message (takes priority over description) */}
    {error ? (
      <FieldError>{error}</FieldError>
    ) : field.description ? (
      <FieldDescription>{field.description}</FieldDescription>
    ) : null}
  </Field>
), (prevProps, nextProps) => {
  return prevProps.value === nextProps.value && prevProps.error === nextProps.error;
});
