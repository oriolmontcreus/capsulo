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

  inputType(type: 'text' | 'email' | 'url' | 'password'): this {
    this.field.inputType = type;
    return this;
  }

  build(): InputField {
    return this.field;
  }
}

export const Input = (name: string): InputBuilder => new InputBuilder(name);


