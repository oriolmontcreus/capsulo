export type FieldType = 'textInput' | 'textarea' | 'richEditor' | 'select';

export interface BaseField {
  type: FieldType;
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}

export interface TextInputField extends BaseField {
  type: 'textInput';
  inputType?: 'text' | 'email' | 'url' | 'password';
}

export interface TextareaField extends BaseField {
  type: 'textarea';
  rows?: number;
  maxLength?: number;
}

export interface RichEditorField extends BaseField {
  type: 'richEditor';
}

export interface SelectField extends BaseField {
  type: 'select';
  options: Array<{ label: string; value: string }>;
  multiple?: boolean;
}

export type Field = TextInputField | TextareaField | RichEditorField | SelectField;

export interface Schema {
  name: string;
  description?: string;
  fields: Field[];
}

export interface ComponentData {
  id: string;
  schemaName: string;
  data: Record<string, { type: FieldType; value: any }>;
}

export interface PageData {
  components: ComponentData[];
}

