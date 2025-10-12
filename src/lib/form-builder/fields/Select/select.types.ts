export interface SelectField {
  type: 'select';
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  options: Array<{ label: string; value: string }>;
  multiple?: boolean;
}


