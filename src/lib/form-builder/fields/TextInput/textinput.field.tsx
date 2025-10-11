import React from 'react';
import type { TextInputField } from '../../core/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TextInputFieldProps {
  field: TextInputField;
  value: any;
  onChange: (value: any) => void;
}

export const TextInputField: React.FC<TextInputFieldProps> = ({ field, value, onChange }) => (
  <div className="space-y-2">
    <Label htmlFor={field.name}>
      {field.label || field.name}
      {field.required && <span className="text-red-500 ml-1">*</span>}
    </Label>
    <Input
      id={field.name}
      type={field.inputType || 'text'}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      required={field.required}
    />
  </div>
);

