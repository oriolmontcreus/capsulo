export interface ColorPickerField<TFormData = unknown> {
    type: 'colorpicker';
    name: string;
    label?: string;
    description?: string;
    required?: boolean | ((formData: TFormData) => boolean);
    defaultValue?: string; // Hex color string (e.g., "#FF0000" or "#FF000050")
    showAlpha?: boolean; // Whether to show alpha channel controls
    presetColors?: string[]; // Array of preset color swatches
    // Table display control
    showInTable?: boolean; // Whether to show this field as a column in a repeater with table variant (default: true)
    hidden?: boolean | ((formData: TFormData) => boolean);
}
