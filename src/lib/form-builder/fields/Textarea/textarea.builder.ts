import type { TextareaField } from './textarea.types';

class TextareaBuilder {
  private field: TextareaField;

  constructor(name: string) {
    this.field = {
      type: 'textarea',
      name,
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

  rows(value: number): this {
    this.field.rows = value;
    return this;
  }

  minLength(value: number): this {
    this.field.minLength = value;
    return this;
  }

  maxLength(value: number): this {
    this.field.maxLength = value;
    return this;
  }

  build(): TextareaField {
    return this.field;
  }
}

export const Textarea = (name: string): TextareaBuilder => new TextareaBuilder(name);
