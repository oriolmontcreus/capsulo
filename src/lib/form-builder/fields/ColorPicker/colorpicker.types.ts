import type { TranslatableField } from '../../core/translation.types';

export interface ColorPickerField extends TranslatableField {
    type: 'colorpicker';
    name: string;
    label?: string;
    description?: string;
    required?: boolean;
    defaultValue?: string; // Hex color string (e.g., "#FF0000" or "#FF000050")
    showAlpha?: boolean; // Whether to show alpha channel controls
    presetColors?: string[]; // Array of preset color swatches
}
