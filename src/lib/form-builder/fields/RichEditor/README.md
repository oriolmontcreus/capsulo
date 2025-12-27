# RichEditor Field

A powerful rich text editor field powered by [Lexical](https://lexical.dev/) for the Capsulo CMS form builder.

## Features

- Full-featured rich text editing with Lexical
- All features enabled by default
- Character count tracking with min/max length validation
- Seamless integration with the Capsulo CMS form builder
- Built-in validation with Zod
- Markdown support with shortcuts
- Drag and drop functionality
- Embeds (YouTube, Twitter)
- Tables, images, and more

## File Structure

```
RichEditor/
├── richeditor.types.ts    # TypeScript type definitions
├── richeditor.builder.ts  # Fluent API builder for field configuration
├── richeditor.field.tsx   # React component that renders the Lexical editor
├── richeditor.zod.ts      # Zod validation schema converter
└── richeditor.plugins.ts  # Available plugin features
```

## Usage

### Basic Example (All Features Enabled)

```typescript
import { RichEditor } from '../fields';
import { SchemaBuilder } from '../builders/SchemaBuilder';

export const blogPostSchema = SchemaBuilder.create('BlogPost')
  .label('Blog Post')
  .fields([
    RichEditor('content')
      .label('Post Content')
      .description('The main content of your blog post')
      .placeholder('Start writing or press / for commands...')
      .required()
      .maxLength(5000),
  ])
  .build();
```

By default, all features are enabled, giving you the full power of the Lexical editor.

### Custom Features Example

```typescript
RichEditor('description')
  .label('Product Description')
  .description('Detailed product information with formatting')
  .placeholder('Describe your product...')
  .required()
  .features([
    'bold',
    'italic',
    'underline',
    'link',
    'bulletList',
    'numberList',
    'heading',
    'paragraph',
    'fixedToolbar',
    'history',
  ])
  .minLength(100)
  .maxLength(2000)
```

## Builder API

The `RichEditor` builder provides the following methods:

- **`.label(string)`** - Set the field label
- **`.description(string)`** - Set the field description (help text)
- **`.placeholder(string)`** - Set the placeholder text
- **`.required(boolean)`** - Mark the field as required (default: true)
- **`.defaultValue(any)`** - Set the default value (Lexical SerializedEditorState)
- **`.minLength(number)`** - Set minimum character count
- **`.maxLength(number)`** - Set maximum character count
- **`.features(features[])`** - Enable only specific features
- **`.disableFeatures(features[])`** - Disable specific features from defaults
- **`.enableAllFeatures()`** - Enable all available features (default)
- **`.disableAllFeatures()`** - Disable all features (plain text editor)

## Feature Configuration

You can customize which features are enabled in the editor. **By default, all features are enabled.**

### Enable Specific Features

```typescript
RichEditor('content')
  .features([
    'bold',
    'italic',
    'link',
    'bulletList',
    'numberList',
    'fixedToolbar',
    'history',
  ])
```

### Disable Specific Features

Starts with all features and removes the specified ones:

```typescript
RichEditor('content')
  .disableFeatures(['table', 'codeBlock', 'image', 'youtube', 'twitter'])
```

### Disable All Features (Plain Text)

```typescript
RichEditor('notes')
  .disableAllFeatures()
```

### Available Features

**Text Formatting**:
- `bold`, `italic`, `underline`, `strikethrough`, `code`
- `subscript`, `superscript`

**Text Styling**:
- `fontFamily`, `fontSize`, `fontColor`, `fontBackground`
- `clearFormatting`

**Block Formatting**:
- `paragraph`, `heading`, `quote`, `codeBlock`

**Lists**:
- `bulletList`, `numberList`, `checkList`

**Alignment**:
- `alignLeft`, `alignCenter`, `alignRight`, `alignJustify`

**Links and Embeds**:
- `link`, `image`, `table`, `horizontalRule`
- `columns`, `youtube`, `twitter`, `embeds`

**Advanced Features**:
- `markdown` - Markdown shortcuts support
- `hashtags` - #hashtag support
- `keywords` - Keyword highlighting
- `draggableBlocks` - Drag and drop blocks
- `codeHighlight` - Syntax highlighting for code blocks

**Toolbars and UI**:
- `fixedToolbar` - Fixed toolbar at the top
- `floatingToolbar` - Floating toolbar on text selection
- `contextMenu` - Right-click context menu
- `componentPicker` - Slash command menu (/)

**Actions**:
- `history` - Undo/redo support
- `speechToText` - Speech-to-text input
- `importExport` - Import/export functionality
- `characterCount` - Character counter
- `maxLength` - Max length enforcement

### Common Patterns

**Full-Featured Editor (Default)**
```typescript
RichEditor('content')
  .label('Content')
  .description('All features enabled by default')
  .required()
```

**Basic Text Editor**
```typescript
RichEditor('basicContent')
  .label('Basic Text Editor')
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
```

**Editor Without Media**
```typescript
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
```

**Simple Editor (No Advanced Features)**
```typescript
RichEditor('simpleContent')
  .label('Simple Editor')
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
    'hashtags',
    'keywords',
  ])
```

**Comment Style Editor**
```typescript
RichEditor('comment')
  .label('Comment')
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
  .maxLength(1000)
```

**Blog Post Editor**
```typescript
RichEditor('blogContent')
  .label('Blog Post')
  .disableFeatures([
    'youtube',
    'twitter',
    'embeds',
    'speechToText',
    'hashtags',
    'keywords',
    'columns',
  ])
  .required()
  .minLength(100)
```

**Documentation Editor**
```typescript
RichEditor('docs')
  .label('Documentation')
  .disableFeatures([
    'youtube',
    'twitter',
    'embeds',
    'speechToText',
    'fontColor',
    'fontBackground',
    'hashtags',
  ])
```

**Plain Text Editor**
```typescript
RichEditor('notes')
  .label('Notes')
  .disableAllFeatures()
  .maxLength(500)
```

## Data Format

The RichEditor stores data in Lexical's SerializedEditorState format:

```json
{
  "root": {
    "children": [
      {
        "children": [
          {
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": "This is a paragraph with ",
            "type": "text",
            "version": 1
          },
          {
            "detail": 0,
            "format": 1,
            "mode": "normal",
            "style": "",
            "text": "bold text",
            "type": "text",
            "version": 1
          }
        ],
        "direction": "ltr",
        "format": "",
        "indent": 0,
        "type": "paragraph",
        "version": 1
      }
    ],
    "direction": "ltr",
    "format": "",
    "indent": 0,
    "type": "root",
    "version": 1
  }
}
```

## Validation

The field supports:
- **Required validation** - Ensures the field is not empty
- **Min/Max length** - Validates character count (counts text content, not markup)
- **Type validation** - Ensures the value is a valid Lexical SerializedEditorState

## Lexical Features

The RichEditor includes extensive features from Lexical:

- **Basic formatting**: Bold, italic, underline, strikethrough, code
- **Text styling**: Font family, size, color, background
- **Headings**: H1, H2, H3
- **Lists**: Bulleted, numbered, and check lists
- **Links**: Insert and edit hyperlinks
- **Images**: Upload and embed images
- **Tables**: Create and edit tables
- **Code blocks**: Syntax-highlighted code blocks with language selection
- **Blockquotes**: Quote formatting
- **Embeds**: YouTube videos, Twitter tweets
- **Markdown**: Full markdown support with shortcuts
- **Drag & Drop**: Reorder blocks and paste images
- **Collaboration**: Hashtags, keywords
- **And much more...**

## Notes

- All features are enabled by default for maximum functionality
- The editor uses Lexical's plugin system for extensibility
- Character count is calculated from text content only (excludes markup)
- The editor is client-side only (`'use client'` directive)
- Fully integrated with Capsulo's validation system
- Press `/` to open the component picker menu for quick insertions

## See Also

- [Lexical Documentation](https://lexical.dev/docs/intro)
- [Capsulo CMS Vision](../../../../docs/CMS_VISION.md)
- [Form Builder Documentation](../../README.md)
