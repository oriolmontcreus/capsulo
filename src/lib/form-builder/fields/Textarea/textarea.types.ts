export interface TextareaField {
  type: 'textarea';
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  rows?: number;
  maxLength?: number;
}


