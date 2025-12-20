/**
 * Plugin Loader - Tiered loading system for RichEditor plugins
 * 
 * Splits plugins into tiers to optimize initial load time:
 * - Core: Always loaded (minimal, required for basic editing)
 * - Common: Loaded on first interaction (frequently used features)
 * - Advanced: Lazy loaded on demand (heavy features)
 */

import React from 'react';
import type { PluginFeature } from '@/lib/form-builder/fields/RichEditor/richeditor.plugins';

// Tier 1: Core plugins - always loaded, minimal bundle impact
export const CORE_PLUGINS: PluginFeature[] = [
    'history',
    'paragraph',
    'fixedToolbar',
];

// Tier 2: Common plugins - loaded after initial render
export const COMMON_PLUGINS: PluginFeature[] = [
    'heading',
    'bulletList',
    'numberList',
    'link',
    'quote',
    'clearFormatting',
];

// Tier 3: Advanced plugins - lazy loaded only when enabled
export const ADVANCED_PLUGINS: PluginFeature[] = [
    'table',
    'image',
    'embeds',
    'youtube',
    'twitter',
    'columns',
    'codeBlock',
    'codeHighlight',
    'mentions',
    'hashtags',
    'keywords',
    'draggableBlocks',
    'speechToText',
    'importExport',
];

// ============================================================================
// LAZY LOADED PLUGIN COMPONENTS
// These are dynamically imported only when the feature is enabled
// ============================================================================

// Table plugins (heavy - includes @lexical/table)
export const LazyTablePlugin = React.lazy(() =>
    import('@lexical/react/LexicalTablePlugin').then(m => ({ default: m.TablePlugin }))
);

// Image plugins (heavy - includes image handling)
export const LazyImagesPlugin = React.lazy(() =>
    import('@/components/editor/plugins/images-plugin').then(m => ({ default: m.ImagesPlugin }))
);

// Code highlight plugins (heavy - includes Prism.js)
export const LazyCodeHighlightPlugin = React.lazy(() =>
    import('@/components/editor/plugins/code-highlight-plugin').then(m => ({ default: m.CodeHighlightPlugin }))
);

export const LazyCodeActionMenuPlugin = React.lazy(() =>
    import('@/components/editor/plugins/code-action-menu-plugin').then(m => ({ default: m.CodeActionMenuPlugin }))
);

// Embed plugins (heavy - includes Twitter/YouTube)
export const LazyTwitterPlugin = React.lazy(() =>
    import('@/components/editor/plugins/embeds/twitter-plugin').then(m => ({ default: m.TwitterPlugin }))
);

export const LazyYouTubePlugin = React.lazy(() =>
    import('@/components/editor/plugins/embeds/youtube-plugin').then(m => ({ default: m.YouTubePlugin }))
);

export const LazyAutoEmbedPlugin = React.lazy(() =>
    import('@/components/editor/plugins/embeds/auto-embed-plugin').then(m => ({ default: m.AutoEmbedPlugin }))
);

// Layout plugins (heavy - includes complex layout handling)
export const LazyLayoutPlugin = React.lazy(() =>
    import('@/components/editor/plugins/layout-plugin').then(m => ({ default: m.LayoutPlugin }))
);

// Draggable blocks (heavy - includes drag-and-drop logic)
export const LazyDraggableBlockPlugin = React.lazy(() =>
    import('@/components/editor/plugins/draggable-block-plugin').then(m => ({ default: m.DraggableBlockPlugin }))
);

// Mentions plugin (heavy - includes autocomplete)
export const LazyMentionsPlugin = React.lazy(() =>
    import('@/components/editor/plugins/mentions-plugin').then(m => ({ default: m.MentionsPlugin }))
);

// Speech to text (heavy - includes Web Speech API)
export const LazySpeechToTextPlugin = React.lazy(() =>
    import('@/components/editor/plugins/actions/speech-to-text-plugin').then(m => ({ default: m.SpeechToTextPlugin }))
);

// Import/Export (heavy - includes file handling)
export const LazyImportExportPlugin = React.lazy(() =>
    import('@/components/editor/plugins/actions/import-export-plugin').then(m => ({ default: m.ImportExportPlugin }))
);
