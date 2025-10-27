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
     * Specify which features to enable in the editor.
     * Only these features will be loaded, providing complete control.
     * Features affect both functionality and UI (toolbars, comments, etc.)
     * 
     * @example
     * RichEditor('content')
     *   .features(['bold', 'italic', 'link', 'bulletList', 'fixedToolbar'])
     */
    features(value: PluginFeature[]): this {
        this.field.features = value;
        // Clear conflicting options
        delete this.field.disableFeatures;
        delete this.field.disableAllFeatures;
        // Clear legacy options
        delete this.field.toolbarButtons;
        delete this.field.disableToolbarButtons;
        delete this.field.disableAllToolbarButtons;
        return this;
    }

    /**
     * Specify which features to disable.
     * Starts with default features and removes the specified ones.
     * 
     * @example
     * RichEditor('content')
     *   .disableFeatures(['table', 'codeBlock', 'image'])
     */
    disableFeatures(value: PluginFeature[]): this {
        this.field.disableFeatures = value;
        // Clear conflicting options
        delete this.field.features;
        delete this.field.disableAllFeatures;
        // Clear legacy options
        delete this.field.toolbarButtons;
        delete this.field.disableToolbarButtons;
        delete this.field.disableAllToolbarButtons;
        return this;
    }

    /**
     * Disable all features, creating a minimal plain text editor.
     * 
     * @example
     * RichEditor('content')
     *   .disableAllFeatures()
     */
    disableAllFeatures(): this {
        this.field.disableAllFeatures = true;
        // Clear conflicting options
        delete this.field.features;
        delete this.field.disableFeatures;
        // Clear legacy options
        delete this.field.toolbarButtons;
        delete this.field.disableToolbarButtons;
        delete this.field.disableAllToolbarButtons;
        return this;
    }

    // Legacy methods for backward compatibility
    /** @deprecated Use features() instead */
    toolbarButtons(value: PluginFeature[]): this {
        return this.features(value);
    }

    /** @deprecated Use disableFeatures() instead */
    disableToolbarButtons(value: PluginFeature[]): this {
        return this.disableFeatures(value);
    }

    /** @deprecated Use disableAllFeatures() instead */
    disableAllToolbarButtons(): this {
        return this.disableAllFeatures();
    }

    build(): RichEditorField {
        return this.field;
    }
}

export const RichEditor = (name: string): RichEditorBuilder => new RichEditorBuilder(name);
