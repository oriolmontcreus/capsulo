import type { ReactNode } from 'react';

export interface TextareaField {
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
}


