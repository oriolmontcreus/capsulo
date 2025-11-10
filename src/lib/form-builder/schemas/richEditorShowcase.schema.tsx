import { RichEditor } from '../fields';
import { Tabs } from '../layouts';
import { createSchema } from '../builders/SchemaBuilder';

export const RichEditorShowcaseSchema = createSchema(
    'RichEditorShowcase',
    [
        Tabs()
            .tab('Full Featured', [
                RichEditor('fullContent')
                    .label('Full-Featured Editor')
                    .description('All features enabled by default - includes formatting, media, tables, embeds, and more')
                    .placeholder('Start typing or press / for commands...')
                    .required(true),
            ])
            .tab('Basic Formatting', [
                RichEditor('basicContent')
                    .label('Basic Text Editor')
                    .description('Only essential text formatting - perfect for simple content')
                    .features([
                        'bold',
                        'italic',
                        'underline',
                        'strikethrough',
                        'link',
                        'bulletList',
                        'numberList',
                        'heading',
                        'paragraph',
                        'quote',
                        'fixedToolbar',
                        'floatingToolbar',
                        'history',
                    ])
                    .placeholder('Basic formatting only...')
                    .maxLength(2000),
            ])
            .tab('No Media', [
                RichEditor('noMediaContent')
                    .label('Editor Without Media')
                    .description('Full formatting but no images, videos, or embeds')
                    .disableFeatures([
                        'image',
                        'youtube',
                        'twitter',
                        'embeds',
                        'speechToText',
                    ])
                    .placeholder('All formatting except media uploads and embeds...'),
            ])
            .tab('No Advanced Features', [
                RichEditor('simpleContent')
                    .label('Simple Editor')
                    .description('No tables, code blocks, or complex layouts')
                    .disableFeatures([
                        'table',
                        'codeBlock',
                        'codeHighlight',
                        'columns',
                        'image',
                        'youtube',
                        'twitter',
                        'embeds',
                        'draggableBlocks',
                        'speechToText',
                        'mentions',
                        'hashtags',
                        'keywords',
                    ])
                    .placeholder('Simple text with basic formatting...'),
            ])
            .tab('Comment Style', [
                RichEditor('commentContent')
                    .label('Comment Editor')
                    .description('Minimal editor for comments - like GitHub or Slack')
                    .features([
                        'bold',
                        'italic',
                        'code',
                        'link',
                        'bulletList',
                        'numberList',
                        'quote',
                        'floatingToolbar',
                        'history',
                        'markdown',
                    ])
                    .placeholder('Write a comment...')
                    .maxLength(1000),
            ])
            .tab('Blog Post', [
                RichEditor('blogContent')
                    .label('Blog Post Editor')
                    .description('Perfect for blog posts - formatting, images, code, but no embeds')
                    .disableFeatures([
                        'youtube',
                        'twitter',
                        'embeds',
                        'speechToText',
                        'mentions',
                        'hashtags',
                        'keywords',
                        'columns',
                    ])
                    .placeholder('Write your blog post...')
                    .required(true)
                    .minLength(100),
            ])
            .tab('Documentation', [
                RichEditor('docsContent')
                    .label('Documentation Editor')
                    .description('Ideal for technical docs - code blocks, tables, but no social embeds')
                    .disableFeatures([
                        'youtube',
                        'twitter',
                        'embeds',
                        'speechToText',
                        'fontColor',
                        'fontBackground',
                        'mentions',
                        'hashtags',
                    ])
                    .placeholder('Write documentation...'),
            ])
            .tab('Plain Text', [
                RichEditor('plainContent')
                    .label('Plain Text Editor')
                    .description('Minimal editor with no formatting - just plain text')
                    .disableAllFeatures()
                    .placeholder('Plain text only...')
                    .maxLength(500),
            ])
    ],
    'Showcase of the rich text editor with various feature configurations',
    'rich-editor-showcase'
);
