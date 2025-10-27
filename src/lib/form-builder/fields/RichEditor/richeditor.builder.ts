import type { RichEditorField } from './richeditor.types';
import type { PluginFeature } from './richeditor.plugins';

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

    variant(value: 'default' | 'demo' | 'comment' | 'select'): this {
        this.field.variant = value;
        return this;
    }

    /**
     * Specify which toolbar buttons/features to enable.
     * Only these features will be loaded, providing complete control.
     * 
     * @example
     * RichEditor('content')
     *   .toolbarButtons(['bold', 'italic', 'link', 'bulletList'])
     */
    toolbarButtons(value: PluginFeature[]): this {
        this.field.toolbarButtons = value;
        // Clear conflicting options
        delete this.field.disableToolbarButtons;
        delete this.field.disableAllToolbarButtons;
        return this;
    }

    /**
     * Specify which toolbar buttons/features to disable.
     * Starts with default features and removes the specified ones.
     * 
     * @example
     * RichEditor('content')
     *   .disableToolbarButtons(['table', 'codeBlock', 'image'])
     */
    disableToolbarButtons(value: PluginFeature[]): this {
        this.field.disableToolbarButtons = value;
        // Clear conflicting options
        delete this.field.toolbarButtons;
        delete this.field.disableAllToolbarButtons;
        return this;
    }

    /**
     * Disable all toolbar buttons/features, creating a minimal editor.
     * 
     * @example
     * RichEditor('content')
     *   .disableAllToolbarButtons()
     */
    disableAllToolbarButtons(): this {
        this.field.disableAllToolbarButtons = true;
        // Clear conflicting options
        delete this.field.toolbarButtons;
        delete this.field.disableToolbarButtons;
        return this;
    }

    build(): RichEditorField {
        return this.field;
    }
}

export const RichEditor = (name: string): RichEditorBuilder => new RichEditorBuilder(name);
