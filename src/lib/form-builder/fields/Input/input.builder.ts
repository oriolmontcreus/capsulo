import type { ReactNode } from 'react';
import type { InputField } from './input.types';

class InputBuilder {
  private field: InputField;

  constructor(name: string) {
    this.field = {
      type: 'input',
      name,
      inputType: 'text',
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

  type(type: 'text' | 'email' | 'url' | 'password' | 'number'): this {
    this.field.inputType = type;
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

  // For text inputs - character length validation
  minLength(value: number): this {
    this.field.minLength = value;
    return this;
  }

  maxLength(value: number): this {
    this.field.maxLength = value;
    return this;
  }

  // For number inputs - numeric value validation
  min(value: number): this {
    this.field.min = value;
    return this;
  }

  max(value: number): this {
    this.field.max = value;
    return this;
  }

  step(value: number): this {
    this.field.step = value;
    return this;
  }

  allowDecimals(value: boolean = true): this {
    this.field.allowDecimals = value;
    if (!value) { this.field.step = 1; }
    return this;
  }

  regex(value: string | RegExp): this {
    this.field.regex = value;
    return this;
  }

  translatable(enabled: boolean = true): this {
    this.field.translatable = enabled;
    return this;
  }

  showInTable(value: boolean = true): this {
    this.field.showInTable = value;
    return this;
  }

  /**
   * @param value - Boolean to hide/show field, or function receiving formData to determine visibility. Defaults to `true`.
   */
  hidden(value: boolean | ((formData: any) => boolean) = true): this {
    this.field.hidden = value;
    return this;
  }

  build(): InputField {
    return this.field;
  }
}

export const Input = (name: string): InputBuilder => new InputBuilder(name);


