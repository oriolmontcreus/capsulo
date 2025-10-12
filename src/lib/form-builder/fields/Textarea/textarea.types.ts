export interface TextareaField {
  type: 'textarea';
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  rows?: number;
  maxLength?: number;
}


