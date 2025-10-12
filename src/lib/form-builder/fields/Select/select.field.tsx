import React from 'react';
import type { SelectField as SelectFieldType } from './select.types';
import { Label } from '@/components/ui/label';
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
}

export const SelectField: React.FC<SelectFieldProps> = ({ field, value, onChange }) => (
  <div className="space-y-3">
    <Label htmlFor={field.name} className="text-sm font-medium text-foreground/80">
      {field.label || field.name}
      {field.required && <span className="text-red-500/80 ml-1">*</span>}
    </Label>
    <Select value={value || ''} onValueChange={onChange} required={field.required}>
      <SelectTrigger id={field.name}>
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
  </div>
);
