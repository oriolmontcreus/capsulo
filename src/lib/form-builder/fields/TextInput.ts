import type { TextInputField } from '../core/types';

class TextInputBuilder {
  private field: TextInputField;

  constructor(name: string) {
    this.field = {
      type: 'textInput',
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

  build(): TextInputField {
    return this.field;
  }
}

export const TextInput = (name: string): TextInputBuilder => new TextInputBuilder(name);

