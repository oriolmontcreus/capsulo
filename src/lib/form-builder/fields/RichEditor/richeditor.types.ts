import type { PluginFeature } from './richeditor.plugins';
import type { TranslatableField } from '../../core/translation.types';

export interface RichEditorField extends TranslatableField {
    type: 'richeditor';
    name: string;
    label?: string;
    description?: string;
    placeholder?: string;
    required?: boolean | ((formData: any) => boolean);
    defaultValue?: any; // Lexical SerializedEditorState
    minLength?: number;
    maxLength?: number;
    variant?: 'default' | 'demo' | 'comment' | 'select';

    /**
     * Specify which features to enable in the editor.
     * If provided, only these features will be loaded.
     * This completely overrides the default features.
     * 
     * Features affect both functionality and UI (toolbars, overlays, etc.)
     * For example, enabling 'bold' adds the bold plugin AND shows bold button in toolbars.
     * 
     * @example
     * features: ['bold', 'italic', 'link', 'bulletList', 'fixedToolbar']
     */
    features?: PluginFeature[];

    /**
     * Specify which features to disable.
     * Starts with default features and removes the specified ones.
     * Cannot be used together with features.
     * 
     * @example
     * disableFeatures: ['table', 'codeBlock', 'image']
     */
    disableFeatures?: PluginFeature[];

    /**
     * Disable all features, creating a minimal plain text editor.
     * When true, no plugins will be loaded except for basic paragraph support.
     * 
     * @default false
     */
    disableAllFeatures?: boolean;

    /**
     * Enable all available features.
     * Use this with disableFeatures to enable everything except specific features.
     * Cannot be used together with features.
     * 
     * @example
     * enableAllFeatures: true,
     * disableFeatures: ['table', 'math', 'toc']
     * 
     * @default false
     */
    enableAllFeatures?: boolean;

    // Legacy support - will be removed in future versions
    /** @deprecated Use 'features' instead */
    toolbarButtons?: PluginFeature[];
    /** @deprecated Use 'disableFeatures' instead */
    disableToolbarButtons?: PluginFeature[];
    /** @deprecated Use 'disableAllFeatures' instead */
    disableAllToolbarButtons?: boolean;
    // Table display control
    showInTable?: boolean; // Whether to show this field as a column in a repeater with table variant (default: true)
    hidden?: boolean | ((formData: any) => boolean);
}
