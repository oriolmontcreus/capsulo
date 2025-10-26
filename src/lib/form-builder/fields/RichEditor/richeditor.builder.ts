import type { RichEditorField } from './richeditor.types';

class RichEditorBuilder {
    private field: RichEditorField;

    constructor(name: string) {
        this.field = {
            type: 'richeditor',
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

    placeholder(value: string): this {
        this.field.placeholder = value;
        return this;
    }

    required(value: boolean = true): this {
        this.field.required = value;
        return this;
    }

    defaultValue(value: any): this {
        this.field.defaultValue = value;
        return this;
    }

    minLength(value: number): this {
        this.field.minLength = value;
        return this;
    }

    maxLength(value: number): this {
        this.field.maxLength = value;
        return this;
    }

    variant(value: 'default' | 'demo' | 'comment' | 'select' | 'ai' | 'aiChat'): this {
        this.field.variant = value;
        return this;
    }

    build(): RichEditorField {
        return this.field;
    }
}

export const RichEditor = (name: string): RichEditorBuilder => new RichEditorBuilder(name);
