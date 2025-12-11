/**
 * Available plugin features for the Lexical rich text editor.
 * These features control both functionality and UI elements (toolbars, buttons, etc.)
 */
export type PluginFeature =
    // Text formatting
    | 'bold'
    | 'italic'
    | 'underline'
    | 'strikethrough'
    | 'code'
    | 'subscript'
    | 'superscript'

    // Text styling
    | 'fontFamily'
    | 'fontSize'
    | 'fontColor'
    | 'fontBackground'
    | 'clearFormatting'

    // Block formatting
    | 'paragraph'
    | 'heading'
    | 'quote'
    | 'codeBlock'

    // Lists
    | 'bulletList'
    | 'numberList'
    | 'checkList'

    // Alignment
    | 'alignLeft'
    | 'alignCenter'
    | 'alignRight'
    | 'alignJustify'

    // Links and embeds
    | 'link'
    | 'image'
    | 'table'
    | 'horizontalRule'
    | 'columns'
    | 'youtube'
    | 'twitter'
    | 'embeds'

    // Advanced features
    | 'markdown'
    | 'mentions'
    | 'hashtags'
    | 'keywords'
    | 'autocomplete'
    | 'draggableBlocks'
    | 'codeHighlight'

    // Toolbars and UI
    | 'fixedToolbar'
    | 'floatingToolbar'
    | 'contextMenu'
    | 'componentPicker'

    // Actions
    | 'history'
    | 'speechToText'
    | 'importExport'
    | 'characterCount'
    | 'maxLength'
    | 'variables';

/**
 * Default features enabled in the editor.
 * This provides a balanced set of commonly used features.
 */
export const DEFAULT_FEATURES: PluginFeature[] = [
    // Text formatting
    'bold',
    'italic',
    'underline',
    'strikethrough',
    'code',
    'subscript',
    'superscript',

    // Text styling
    'fontFamily',
    'fontSize',
    'fontColor',
    'fontBackground',
    'clearFormatting',

    // Block formatting
    'paragraph',
    'heading',
    'quote',
    'codeBlock',

    // Lists
    'bulletList',
    'numberList',
    'checkList',

    // Alignment
    'alignLeft',
    'alignCenter',
    'alignRight',
    'alignJustify',

    // Links and embeds
    'link',
    'image',
    'table',
    'horizontalRule',
    'columns',
    'youtube',
    'twitter',
    'embeds',

    // Advanced features
    'markdown',
    'mentions',
    'hashtags',
    'keywords',
    'autocomplete',
    'draggableBlocks',
    'codeHighlight',

    // Toolbars and UI
    'fixedToolbar',
    'floatingToolbar',
    'contextMenu',
    'componentPicker',

    // Actions
    'history',
    'speechToText',
    'importExport',
    'characterCount',
    'maxLength',
    'variables',
];

/**
 * All available features in the editor.
 */
export const ALL_FEATURES: PluginFeature[] = DEFAULT_FEATURES;
