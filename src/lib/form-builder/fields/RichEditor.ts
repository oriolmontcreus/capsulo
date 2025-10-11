import type { RichEditorField } from '../core/types';

class RichEditorBuilder {
  private field: RichEditorField;

  constructor(name: string) {
    this.field = {
      type: 'richEditor',
      name,
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

  build(): RichEditorField {
    return this.field;
  }
}

export const RichEditor = (name: string): RichEditorBuilder => new RichEditorBuilder(name);

