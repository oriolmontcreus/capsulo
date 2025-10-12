import React from 'react';
import type { SelectField as SelectFieldType } from './select.types';
import { Label } from '@/components/ui/label';

interface SelectFieldProps {
  field: SelectFieldType;
  value: any;
  onChange: (value: any) => void;
}

export const SelectField: React.FC<SelectFieldProps> = ({ field, value, onChange }) => (
  <div className="space-y-3">
    <Label htmlFor={field.name} className="text-sm font-medium text-foreground/80">
      {field.label || field.name}
      {field.required && <span className="text-red-500/80 ml-1">*</span>}
    </Label>
    <select
      id={field.name}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      required={field.required}
      className="flex h-10 w-full rounded-md border border-border/60 bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-border focus-visible:bg-background disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="" className="text-muted-foreground/60">{field.placeholder || 'Select an option'}</option>
      {field.options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);
