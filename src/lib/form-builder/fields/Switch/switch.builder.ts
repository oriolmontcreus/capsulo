import type { SwitchField } from './switch.types';

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

    required(value: boolean = true): this {
        this.field.required = value;
        return this;
    }

    defaultValue(value: boolean): this {
        this.field.defaultValue = value;
        return this;
    }

    build(): SwitchField {
        return this.field;
    }
}

export const Switch = (name: string): SwitchBuilder => new SwitchBuilder(name);
