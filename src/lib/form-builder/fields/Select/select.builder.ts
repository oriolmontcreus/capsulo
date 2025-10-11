import type { SelectField } from '../../core/types';

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

  options(value: Array<{ label: string; value: string }>): this {
    this.field.options = value;
    return this;
  }

  multiple(value: boolean = true): this {
    this.field.multiple = value;
    return this;
  }

  build(): SelectField {
    return this.field;
  }
}

export const Select = (name: string): SelectBuilder => new SelectBuilder(name);

