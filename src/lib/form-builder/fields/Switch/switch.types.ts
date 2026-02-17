import type { ColSpanValue } from '../../core/translation.types';

export interface SwitchField<TFormData = unknown> {
    type: 'switch';
    name: string;
    label?: string;
    description?: string;
    required?: boolean | ((formData: TFormData) => boolean);
    defaultValue?: boolean;
    // Table display control
    showInTable?: boolean; // Whether to show this field as a column in a repeater with table variant (default: true)
    hidden?: boolean | ((formData: TFormData) => boolean);
    // Column span for grid layouts
    colSpan?: ColSpanValue;
}
