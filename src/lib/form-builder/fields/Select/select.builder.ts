import type { ReactNode } from 'react';
import type { SelectField, SelectOption } from './select.types';

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

  build(): SelectField {
    return this.field;
  }
}

export const Select = (name: string): SelectBuilder => new SelectBuilder(name);
