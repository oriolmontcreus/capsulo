import type { ColorPickerField } from './colorpicker.types';

class ColorPickerBuilder {
    private field: ColorPickerField;

    constructor(name: string) {
        this.field = {
            type: 'colorpicker',
            name,
            showAlpha: false,
        };
    }

    label(value: string): this {
        this.field.label = value;
        return this;
    }

    description(value: string): this {
        this.field.description = value;
        return this;
    }

    required(value: boolean = true): this {
        this.field.required = value;
        return this;
    }

    defaultValue(value: string): this {
        this.field.defaultValue = value;
        return this;
    }

    showAlpha(value: boolean = true): this {
        this.field.showAlpha = value;
        return this;
    }

    presetColors(colors: string[]): this {
        this.field.presetColors = colors;
        return this;
    }

    showInTable(value: boolean = true): this {
        this.field.showInTable = value;
        return this;
    }

    /**
     * @param value - Boolean to hide/show field, or function receiving formData to determine visibility. Defaults to `true`.
     */
    hidden<T = Record<string, any>>(value: boolean | ((formData: T) => boolean) = true): this {
        this.field.hidden = value;
        return this;
    }

    build(): ColorPickerField {
        return this.field;
    }
}

export const ColorPicker = (name: string): ColorPickerBuilder => new ColorPickerBuilder(name);
