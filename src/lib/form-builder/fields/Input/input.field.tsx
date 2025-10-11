import React from 'react';
import type { InputField as InputFieldType } from './input.types';
import { Input as InputUI } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface InputFieldProps {
  field: InputFieldType;
  value: any;
  onChange: (value: any) => void;
}

export const InputField: React.FC<InputFieldProps> = ({ field, value, onChange }) => (
  <div className="space-y-2">
    <Label htmlFor={field.name}>
      {field.label || field.name}
      {field.required && <span className="text-red-500 ml-1">*</span>}
    </Label>
    <InputUI
      id={field.name}
      type={field.inputType || 'text'}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      required={field.required}
    />
  </div>
);


