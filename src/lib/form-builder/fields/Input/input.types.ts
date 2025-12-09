import type { ReactNode } from 'react';
import type { TranslatableField } from '../../core/translation.types';

export interface InputField extends TranslatableField {
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
  // Regex pattern validation
  regex?: string | RegExp; // Regex pattern for validation
  // Table display control
  showInTable?: boolean; // Whether to show this field as a column in a repeater with table variant (default: true)
  hidden?: boolean;
}


