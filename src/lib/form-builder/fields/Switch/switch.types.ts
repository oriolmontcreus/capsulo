export interface SwitchField {
    type: 'switch';
    name: string;
    label?: string;
    description?: string;
    required?: boolean | ((formData: any) => boolean);
    defaultValue?: boolean;
    // Table display control
    showInTable?: boolean; // Whether to show this field as a column in a repeater with table variant (default: true)
    hidden?: boolean | ((formData: any) => boolean);
}
