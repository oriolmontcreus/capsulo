import type { Field } from '../../core/types';
import type { RepeaterField } from './repeater.types';

interface FieldBuilder {
    build(): Field;
}

class RepeaterBuilder {
    private field: RepeaterField;

    constructor(name: string, fields: (Field | FieldBuilder)[] = []) {
        const builtFields = fields.map(field =>
            'build' in field ? field.build() : field
        );

        this.field = {
            type: 'repeater',
            name,
            fields: builtFields,
            defaultValue: [],
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

    minItems(value: number): this {
        this.field.minItems = value;
        return this;
    }

    maxItems(value: number): this {
        this.field.maxItems = value;
        return this;
    }

    defaultValue(value: any[]): this {
        this.field.defaultValue = value;
        return this;
    }

    build(): RepeaterField {
        return this.field;
    }
}

export const Repeater = (name: string, fields: (Field | FieldBuilder)[]): RepeaterBuilder => new RepeaterBuilder(name, fields);
