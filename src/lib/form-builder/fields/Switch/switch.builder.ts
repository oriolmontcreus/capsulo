import type { SwitchField } from './switch.types';
import type { ColSpanValue } from '../../core/translation.types';

class SwitchBuilder {
    private field: SwitchField;

    constructor(name: string) {
        this.field = {
            type: 'switch',
            name,
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

    required<T = Record<string, any>>(value: boolean | ((formData: T) => boolean) = true): this {
        this.field.required = value;
        return this;
    }

    defaultValue(value: boolean): this {
        this.field.defaultValue = value;
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

    /**
     * Set the column span for this field when rendered in a grid layout
     * @param value - Number of columns to span, "full" for all columns, or responsive object
     */
    colSpan(value: ColSpanValue): this {
        this.field.colSpan = value;
        return this;
    }

    build(): SwitchField {
        return this.field;
    }
}

export const Switch = (name: string): SwitchBuilder => new SwitchBuilder(name);
