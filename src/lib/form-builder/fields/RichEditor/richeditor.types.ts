import type { PluginFeature } from './richeditor.plugins';

export interface RichEditorField {
    type: 'richeditor';
    name: string;
    label?: string;
    description?: string;
    placeholder?: string;
    required?: boolean;
    defaultValue?: any; // Plate editor value (array of nodes)
    minLength?: number;
    maxLength?: number;
    variant?: 'default' | 'demo' | 'comment' | 'select';

    /**
     * Specify which toolbar buttons/features to enable.
     * If provided, only these features will be loaded.
     * This completely overrides the default features.
     * 
     * @example
     * toolbarButtons: ['bold', 'italic', 'link', 'bulletList']
     */
    toolbarButtons?: PluginFeature[];

    /**
     * Specify which toolbar buttons/features to disable.
     * Starts with default features and removes the specified ones.
     * Cannot be used together with toolbarButtons.
     * 
     * @example
     * disableToolbarButtons: ['table', 'codeBlock', 'image']
     */
    disableToolbarButtons?: PluginFeature[];

    /**
     * Disable all toolbar buttons/features, creating a minimal editor.
     * When true, no plugins will be loaded except for basic paragraph support.
     * 
     * @default false
     */
    disableAllToolbarButtons?: boolean;
}
