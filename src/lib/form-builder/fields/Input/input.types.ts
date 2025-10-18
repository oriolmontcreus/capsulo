import type { ReactNode } from 'react';

export interface InputField {
  type: 'input';
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  inputType?: 'text' | 'email' | 'url' | 'password' | 'number';
  prefix?: ReactNode;
  suffix?: ReactNode;
  // For text inputs (character length validation)
  minLength?: number;
  maxLength?: number;
  // For number inputs (numeric value validation)
  min?: number;
  max?: number;
  step?: number; // Controls decimal precision (e.g., 1 = integers only, 0.01 = 2 decimals)
  allowDecimals?: boolean; // If false, step will be set to 1
}


