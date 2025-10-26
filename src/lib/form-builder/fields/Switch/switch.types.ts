export interface SwitchField {
    type: 'switch';
    name: string;
    label?: string;
    description?: string;
    required?: boolean;
    defaultValue?: boolean;
}
