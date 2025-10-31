import type { ReactNode } from 'react';
import type { SelectField, SelectOption, SelectOptionGroup, ResponsiveColumns } from './select.types';

class SelectBuilder {
  private field: SelectField;

  constructor(name: string) {
    this.field = {
      type: 'select',
      name,
      options: [],
    };
  }

  label(value: string): this {
    this.field.label = value;
    return this;
  }

  description(value: string): this {
    this.field.description = value;
    return this;
  }

  placeholder(value: string): this {
    this.field.placeholder = value;
    return this;
  }

  required(value: boolean = true): this {
    this.field.required = value;
    return this;
  }

  defaultValue(value: string): this {
    this.field.defaultValue = value;
    return this;
  }

  options(value: Array<SelectOption>): this {
    this.field.options = value;
    return this;
  }

  groups(value: Array<SelectOptionGroup>): this {
    this.field.groups = value;
    // Clear individual options when using groups
    this.field.options = [];
    return this;
  }

  multiple(value: boolean = true): this {
    this.field.multiple = value;
    return this;
  }

  prefix(value: ReactNode): this {
    this.field.prefix = value;
    return this;
  }

  suffix(value: ReactNode): this {
    this.field.suffix = value;
    return this;
  }

  searchable(value: boolean = true): this {
    this.field.searchable = value;
    return this;
  }

  emptyMessage(value: string): this {
    this.field.emptyMessage = value;
    return this;
  }

  searchPlaceholder(value: string): this {
    this.field.searchPlaceholder = value;
    return this;
  }

  columns(value: number | ResponsiveColumns): this {
    if (typeof value === 'number') {
      this.field.columns = Math.max(1, Math.min(value, 4)); // Limit to 1-4 columns for usability
    } else {
      // Validate responsive values
      const responsive: ResponsiveColumns = {};
      if (value.base !== undefined) responsive.base = Math.max(1, Math.min(value.base, 4));
      if (value.sm !== undefined) responsive.sm = Math.max(1, Math.min(value.sm, 4));
      if (value.md !== undefined) responsive.md = Math.max(1, Math.min(value.md, 4));
      if (value.lg !== undefined) responsive.lg = Math.max(1, Math.min(value.lg, 4));
      if (value.xl !== undefined) responsive.xl = Math.max(1, Math.min(value.xl, 4));
      this.field.columns = responsive;
    }
    return this;
  }

  build(): SelectField {
    return this.field;
  }
}

export const Select = (name: string): SelectBuilder => new SelectBuilder(name);
