import type { ReactNode } from 'react';
import type { TranslatableField } from '../../core/translation.types';

export interface TextareaField extends TranslatableField {
  type: 'textarea';
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  rows?: number;
  minLength?: number;
  maxLength?: number;
  prefix?: ReactNode;
  suffix?: ReactNode;
  autoResize?: boolean; // Automatically grow/shrink based on content
  minRows?: number; // Minimum visible rows when autoResize is enabled
  maxRows?: number; // Maximum rows before scrolling appears
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'; // Control textarea resize handle
  // Regex pattern validation
  regex?: string | RegExp; // Regex pattern for validation
  // Table display control
  showInTable?: boolean; // Whether to show this field as a column in a repeater with table variant (default: true)
}


