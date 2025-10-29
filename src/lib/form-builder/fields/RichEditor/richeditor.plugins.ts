/**
 * Plugin feature registry for the Rich Editor
 * Maps feature names to their corresponding kits for dynamic loading
 */

export type PluginFeature =
    // Basic Marks
    | 'bold'
    | 'italic'
    | 'underline'
    | 'strikethrough'
    | 'code'
    | 'subscript'
    | 'superscript'
    | 'highlight'
    | 'kbd'
    // Font
    | 'fontSize'
    | 'fontFamily'
    | 'fontColor'
    | 'fontBackgroundColor'
    // Alignment
    | 'align'
    // Line Height
    | 'lineHeight'
    // Indent
    | 'indent'
    // Basic Blocks
    | 'heading'
    | 'paragraph'
    | 'blockquote'
    | 'horizontalRule'
    // Lists
    | 'bulletList'
    | 'orderedList'
    | 'todoList'
    // Code Block
    | 'codeBlock'
    // Table
    | 'table'
    // Media
    | 'image'
    | 'media'
    // Link
    | 'link'
    // Mention
    | 'mention'
    // Toggle
    | 'toggle'
    // Callout
    | 'callout'
    // Column
    | 'column'
    // Math
    | 'math'
    // Date
    | 'date'
    // TOC
    | 'toc'
    // Collaboration
    | 'discussion'
    | 'comment'
    | 'suggestion'
    // Editing Features
    | 'slash'
    | 'autoformat'
    | 'cursorOverlay'
    | 'blockMenu'
    | 'dnd'
    | 'emoji'
    | 'exitBreak'
    | 'trailingBlock'
    // UI
    | 'blockPlaceholder'
    | 'fixedToolbar'
    | 'floatingToolbar';

/**
 * Plugin feature metadata
 */
interface PluginFeatureInfo {
    /** Display name for the feature */
    name: string;
    /** Feature category */
    category: 'marks' | 'blocks' | 'lists' | 'media' | 'collaboration' | 'editing' | 'ui' | 'formatting';
    /** Import function that returns the kit */
    loader: () => Promise<any>;
    /** Features that this feature depends on */
    dependencies?: PluginFeature[];
}

/**
 * Registry of all available plugin features
 */
export const PLUGIN_FEATURES: Record<PluginFeature, PluginFeatureInfo> = {
    // Basic Marks
    bold: {
        name: 'Bold',
        category: 'marks',
        loader: async () => (await import('@/components/basic-marks-kit')).BasicMarksKit,
    },
    italic: {
        name: 'Italic',
        category: 'marks',
        loader: async () => (await import('@/components/basic-marks-kit')).BasicMarksKit,
    },
    underline: {
        name: 'Underline',
        category: 'marks',
        loader: async () => (await import('@/components/basic-marks-kit')).BasicMarksKit,
    },
    strikethrough: {
        name: 'Strikethrough',
        category: 'marks',
        loader: async () => (await import('@/components/basic-marks-kit')).BasicMarksKit,
    },
    code: {
        name: 'Inline Code',
        category: 'marks',
        loader: async () => (await import('@/components/basic-marks-kit')).BasicMarksKit,
    },
    subscript: {
        name: 'Subscript',
        category: 'marks',
        loader: async () => (await import('@/components/basic-marks-kit')).BasicMarksKit,
    },
    superscript: {
        name: 'Superscript',
        category: 'marks',
        loader: async () => (await import('@/components/basic-marks-kit')).BasicMarksKit,
    },
    highlight: {
        name: 'Highlight',
        category: 'marks',
        loader: async () => (await import('@/components/basic-marks-kit')).BasicMarksKit,
    },
    kbd: {
        name: 'Keyboard',
        category: 'marks',
        loader: async () => (await import('@/components/basic-marks-kit')).BasicMarksKit,
    },

    // Font
    fontSize: {
        name: 'Font Size',
        category: 'formatting',
        loader: async () => (await import('@/components/font-kit')).FontKit,
    },
    fontFamily: {
        name: 'Font Family',
        category: 'formatting',
        loader: async () => (await import('@/components/font-kit')).FontKit,
    },
    fontColor: {
        name: 'Font Color',
        category: 'formatting',
        loader: async () => (await import('@/components/font-kit')).FontKit,
    },
    fontBackgroundColor: {
        name: 'Font Background Color',
        category: 'formatting',
        loader: async () => (await import('@/components/font-kit')).FontKit,
    },

    // Alignment
    align: {
        name: 'Align',
        category: 'formatting',
        loader: async () => (await import('@/components/align-kit')).AlignKit,
    },

    // Line Height
    lineHeight: {
        name: 'Line Height',
        category: 'formatting',
        loader: async () => (await import('@/components/line-height-kit')).LineHeightKit,
    },

    // Indent
    indent: {
        name: 'Indent',
        category: 'formatting',
        loader: async () => (await import('@/components/indent-kit')).IndentKit,
    },

    // Basic Blocks
    heading: {
        name: 'Heading',
        category: 'blocks',
        loader: async () => (await import('@/components/basic-blocks-kit')).BasicBlocksKit,
    },
    paragraph: {
        name: 'Paragraph',
        category: 'blocks',
        loader: async () => (await import('@/components/basic-blocks-kit')).BasicBlocksKit,
    },
    blockquote: {
        name: 'Blockquote',
        category: 'blocks',
        loader: async () => (await import('@/components/basic-blocks-kit')).BasicBlocksKit,
    },
    horizontalRule: {
        name: 'Horizontal Rule',
        category: 'blocks',
        loader: async () => (await import('@/components/basic-blocks-kit')).BasicBlocksKit,
    },

    // Lists
    bulletList: {
        name: 'Bullet List',
        category: 'lists',
        loader: async () => (await import('@/components/list-kit')).ListKit,
    },
    orderedList: {
        name: 'Ordered List',
        category: 'lists',
        loader: async () => (await import('@/components/list-kit')).ListKit,
    },
    todoList: {
        name: 'Todo List',
        category: 'lists',
        loader: async () => (await import('@/components/list-kit')).ListKit,
    },

    // Code Block
    codeBlock: {
        name: 'Code Block',
        category: 'blocks',
        loader: async () => (await import('@/components/code-block-kit')).CodeBlockKit,
    },

    // Table
    table: {
        name: 'Table',
        category: 'blocks',
        loader: async () => (await import('@/components/table-kit')).TableKit,
    },

    // Media
    image: {
        name: 'Image',
        category: 'media',
        loader: async () => (await import('@/components/media-kit')).MediaKit,
    },
    media: {
        name: 'Media',
        category: 'media',
        loader: async () => (await import('@/components/media-kit')).MediaKit,
    },

    // Link
    link: {
        name: 'Link',
        category: 'blocks',
        loader: async () => (await import('@/components/link-kit')).LinkKit,
    },

    // Mention
    mention: {
        name: 'Mention',
        category: 'blocks',
        loader: async () => (await import('@/components/mention-kit')).MentionKit,
    },

    // Toggle
    toggle: {
        name: 'Toggle',
        category: 'blocks',
        loader: async () => (await import('@/components/toggle-kit')).ToggleKit,
    },

    // Callout
    callout: {
        name: 'Callout',
        category: 'blocks',
        loader: async () => (await import('@/components/callout-kit')).CalloutKit,
    },

    // Column
    column: {
        name: 'Column',
        category: 'blocks',
        loader: async () => (await import('@/components/column-kit')).ColumnKit,
    },

    // Math
    math: {
        name: 'Math',
        category: 'blocks',
        loader: async () => (await import('@/components/math-kit')).MathKit,
    },

    // Date
    date: {
        name: 'Date',
        category: 'blocks',
        loader: async () => (await import('@/components/date-kit')).DateKit,
    },

    // TOC
    toc: {
        name: 'Table of Contents',
        category: 'blocks',
        loader: async () => (await import('@/components/toc-kit')).TocKit,
    },

    // Collaboration
    discussion: {
        name: 'Discussion',
        category: 'collaboration',
        loader: async () => (await import('@/components/discussion-kit')).DiscussionKit,
    },
    comment: {
        name: 'Comment',
        category: 'collaboration',
        loader: async () => (await import('@/components/comment-kit')).CommentKit,
        dependencies: ['discussion'], // Comment requires discussion plugin for UI
    },
    suggestion: {
        name: 'Suggestion',
        category: 'collaboration',
        loader: async () => (await import('@/components/suggestion-kit')).SuggestionKit,
        dependencies: ['discussion'], // Suggestion requires discussion plugin for UI
    },

    // Editing Features
    slash: {
        name: 'Slash Commands',
        category: 'editing',
        loader: async () => (await import('@/components/slash-kit')).SlashKit,
    },
    autoformat: {
        name: 'Autoformat',
        category: 'editing',
        loader: async () => (await import('@/components/autoformat-kit')).AutoformatKit,
    },
    cursorOverlay: {
        name: 'Cursor Overlay',
        category: 'editing',
        loader: async () => (await import('@/components/cursor-overlay-kit')).CursorOverlayKit,
    },
    blockMenu: {
        name: 'Block Menu',
        category: 'editing',
        loader: async () => (await import('@/components/block-menu-kit')).BlockMenuKit,
    },
    dnd: {
        name: 'Drag and Drop',
        category: 'editing',
        loader: async () => (await import('@/components/dnd-kit')).DndKit,
    },
    emoji: {
        name: 'Emoji',
        category: 'editing',
        loader: async () => (await import('@/components/emoji-kit')).EmojiKit,
    },
    exitBreak: {
        name: 'Exit Break',
        category: 'editing',
        loader: async () => (await import('@/components/exit-break-kit')).ExitBreakKit,
    },
    trailingBlock: {
        name: 'Trailing Block',
        category: 'editing',
        loader: async () => {
            const { TrailingBlockPlugin } = await import('platejs');
            return [TrailingBlockPlugin];
        },
    },

    // UI
    blockPlaceholder: {
        name: 'Block Placeholder',
        category: 'ui',
        loader: async () => (await import('@/components/block-placeholder-kit')).BlockPlaceholderKit,
    },
    fixedToolbar: {
        name: 'Fixed Toolbar',
        category: 'ui',
        loader: async () => (await import('@/components/fixed-toolbar-kit')).FixedToolbarKit,
    },
    floatingToolbar: {
        name: 'Floating Toolbar',
        category: 'ui',
        loader: async () => (await import('@/components/floating-toolbar-kit')).FloatingToolbarKit,
    },
};

/**
 * Default features enabled for the rich editor
 */
export const DEFAULT_FEATURES: PluginFeature[] = [
    // Basic marks
    'bold',
    'italic',
    'underline',
    'strikethrough',
    'code',

    // Basic blocks
    'heading',
    'paragraph',
    'blockquote',
    'horizontalRule',

    // Lists
    'bulletList',
    'orderedList',

    // Code block
    'codeBlock',

    // Table
    'table',

    // Media
    'image',

    // Link
    'link',

    // Editing
    'autoformat',
    'blockMenu',
    'dnd',
    'exitBreak',
    'trailingBlock',

    // UI
    'blockPlaceholder',
    'floatingToolbar',
];

/**
 * All available features in the rich editor
 * Use this to enable everything and then selectively disable features
 */
export const ALL_FEATURES: PluginFeature[] = Object.keys(PLUGIN_FEATURES) as PluginFeature[];

/**
 * Resolve dependencies for a set of features
 */
function resolveDependencies(features: PluginFeature[]): PluginFeature[] {
    const resolved = new Set<PluginFeature>(features);
    const toProcess = [...features];

    while (toProcess.length > 0) {
        const feature = toProcess.pop()!;
        const info = PLUGIN_FEATURES[feature];

        if (info?.dependencies) {
            for (const dep of info.dependencies) {
                if (!resolved.has(dep)) {
                    resolved.add(dep);
                    toProcess.push(dep);
                }
            }
        }
    }

    return Array.from(resolved);
}

/**
 * Get the enabled features based on configuration
 * Supports both new (features) and legacy (toolbarButtons) naming
 */
export function getEnabledFeatures(
    features?: PluginFeature[],
    disableFeatures?: PluginFeature[],
    disableAllFeatures?: boolean,
    enableAllFeatures?: boolean,
    // Legacy support
    toolbarButtons?: PluginFeature[],
    disableToolbarButtons?: PluginFeature[],
    disableAllToolbarButtons?: boolean
): PluginFeature[] {
    // Support legacy naming (will be removed in future versions)
    const enabledFeatures = features || toolbarButtons;
    const disabledFeatures = disableFeatures || disableToolbarButtons;
    const allDisabled = disableAllFeatures || disableAllToolbarButtons;

    // If all disabled, return empty array
    if (allDisabled || (enabledFeatures && enabledFeatures.length === 0)) {
        return [];
    }

    let baseFeatures: PluginFeature[];

    // If specific features provided, use those
    if (enabledFeatures) {
        baseFeatures = enabledFeatures;
    }
    // If enabling all features, start with ALL_FEATURES and optionally remove disabled ones
    else if (enableAllFeatures) {
        baseFeatures = disabledFeatures
            ? ALL_FEATURES.filter(feature => !disabledFeatures.includes(feature))
            : ALL_FEATURES;
    }
    // If disabling specific features, start with defaults and remove disabled ones
    else if (disabledFeatures) {
        baseFeatures = DEFAULT_FEATURES.filter(feature => !disabledFeatures.includes(feature));
    }
    // Default: return all default features
    else {
        baseFeatures = DEFAULT_FEATURES;
    }

    // Resolve dependencies (e.g., comment/suggestion need discussion)
    return resolveDependencies(baseFeatures);
}

/**
 * Dynamically load plugin kits based on enabled features
 */
export async function loadPluginKits(features: PluginFeature[]): Promise<{
    plugins: any[];
    enabledFeatures: PluginFeature[];
}> {
    if (features.length === 0) {
        return { plugins: [], enabledFeatures: [] };
    }

    // Deduplicate loaders by kit name to avoid loading the same kit multiple times
    const loaderMap = new Map<string, () => Promise<any>>();

    for (const feature of features) {
        const info = PLUGIN_FEATURES[feature];
        if (info) {
            // Use the category + feature name as a unique key
            // This ensures we only load each kit once even if multiple features use it
            const key = `${info.category}-${feature}`;

            // For kits that share the same import (like BasicMarksKit), we want to deduplicate
            // by checking if we've already added a loader for this category
            const kitKey = info.loader.toString(); // Use function string as identifier
            loaderMap.set(kitKey, info.loader);
        }
    }

    // Load all unique kits in parallel
    const kits = await Promise.all(
        Array.from(loaderMap.values()).map(loader => loader())
    );

    // Flatten the array of kits (each kit is an array of plugins)
    const allPlugins = kits.flat();

    // Filter out toolbar plugins - we'll add our own custom one
    const filteredPlugins = allPlugins.filter((plugin) => {
        const key = plugin?.key || '';
        return key !== 'fixed-toolbar' && key !== 'floating-toolbar';
    });

    return { plugins: filteredPlugins, enabledFeatures: features };
}
