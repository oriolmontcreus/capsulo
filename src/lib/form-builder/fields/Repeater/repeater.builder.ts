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
            variant: 'card', // Default to card for backward compatibility
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
        // Validate non-negative integer
        if (!Number.isInteger(value) || value < 0) {
            throw new RangeError('minItems must be a non-negative integer');
        }

        // Enforce consistency with maxItems if set
        if (this.field.maxItems !== undefined && value > this.field.maxItems) {
            throw new RangeError(`minItems (${value}) cannot be greater than maxItems (${this.field.maxItems})`);
        }

        this.field.minItems = value;
        return this;
    }

    maxItems(value: number): this {
        // Validate non-negative integer
        if (!Number.isInteger(value) || value < 0) {
            throw new RangeError('maxItems must be a non-negative integer');
        }

        // Enforce consistency with minItems if set
        if (this.field.minItems !== undefined && value < this.field.minItems) {
            throw new RangeError(`maxItems (${value}) cannot be less than minItems (${this.field.minItems})`);
        }

        this.field.maxItems = value;
        return this;
    }

    defaultValue(value: any[]): this {
        // Ensure value is an array
        if (!Array.isArray(value)) {
            throw new Error('defaultValue must be an array');
        }

        // Validate against minItems constraint
        const minItems = this.field.minItems ?? 0;
        if (value.length < minItems) {
            throw new Error(`defaultValue array length (${value.length}) is less than minItems (${minItems})`);
        }

        // Validate against maxItems constraint
        const maxItems = this.field.maxItems ?? Infinity;
        if (value.length > maxItems) {
            throw new Error(`defaultValue array length (${value.length}) exceeds maxItems (${maxItems})`);
        }

        this.field.defaultValue = value;
        return this;
    }

    itemName(value: string): this {
        this.field.itemName = value;
        return this;
    }

    itemPluralName(value: string): this {
        this.field.itemPluralName = value;
        return this;
    }

    variant(variant: 'card' | 'table'): this {
        this.field.variant = variant;
        return this;
    }

    hidden(value: boolean | ((formData: any) => boolean) = true): this {
        this.field.hidden = value;
        return this;
    }

    build(): RepeaterField {
        return this.field;
    }
}

export const Repeater = (name: string, fields: (Field | FieldBuilder)[]): RepeaterBuilder => new RepeaterBuilder(name, fields);
