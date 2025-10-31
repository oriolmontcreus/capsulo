import type { ReactNode } from 'react';

export interface SelectOption {
  label: string;
  value: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  disabled?: boolean;
}

export interface SelectOptionGroup {
  label: string;
  options: Array<SelectOption>;
}

export interface ResponsiveColumns {
  base?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
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
  groups?: Array<SelectOptionGroup>;
  multiple?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  searchable?: boolean;
  clearable?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
  columns?: number | ResponsiveColumns;
}


