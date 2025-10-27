export interface RichEditorField {
    type: 'richeditor';
    name: string;
    label?: string;
    description?: string;
    placeholder?: string;
    required?: boolean;
    defaultValue?: any; // Plate editor value (array of nodes)
    minLength?: number;
    maxLength?: number;
    variant?: 'default' | 'demo' | 'comment' | 'select';
}
