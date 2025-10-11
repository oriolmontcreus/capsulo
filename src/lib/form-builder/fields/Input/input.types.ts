export interface InputField {
  type: 'input';
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  inputType?: 'text' | 'email' | 'url' | 'password';
}


