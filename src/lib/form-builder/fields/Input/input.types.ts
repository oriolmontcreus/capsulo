import type { ReactNode } from 'react';

export interface InputField {
  type: 'input';
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  inputType?: 'text' | 'email' | 'url' | 'password';
  prefix?: ReactNode;
  suffix?: ReactNode;
  minLength?: number;
  maxLength?: number;
}


