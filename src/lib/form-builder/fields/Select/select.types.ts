import type { ReactNode } from 'react';

export interface SelectOption {
  label: string;
  value: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export interface SelectField {
  type: 'select';
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  options: Array<SelectOption>;
  multiple?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
}


