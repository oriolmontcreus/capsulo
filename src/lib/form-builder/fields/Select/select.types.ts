import type { ReactNode } from 'react';
import type { PageInfo } from './page-scanner';

export interface SelectOption {
  label: string;
  value: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  disabled?: boolean;
  description?: string; // Secondary text shown in muted color
}export interface SelectOptionGroup {
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

export interface SelectField<TFormData = unknown> {
  type: 'select';
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean | ((formData: TFormData) => boolean);
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
  // Advanced filtering
  highlightMatches?: boolean;
  minSearchLength?: number;
  // Virtualization
  virtualized?: boolean;
  itemHeight?: number;
  maxVisible?: number;
  virtualizeThreshold?: number;
  // Internal links
  internalLinks?: boolean;
  autoResolveLocale?: boolean;
  availablePages?: PageInfo[];
  groupBySection?: boolean;
  // Table display control
  showInTable?: boolean; // Whether to show this field as a column in a repeater with table variant (default: true)
  hidden?: boolean | ((formData: TFormData) => boolean);
}


