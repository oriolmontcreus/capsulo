# RichEditor Field

A rich text editor field powered by [PlateJS](https://platejs.org/) for the Capsulo CMS form builder.

## Features

- Full-featured rich text editing with PlateJS
- Character count tracking with min/max length validation
- Multiple editor variants (default, demo, comment, select)
- Seamless integration with the Capsulo CMS form builder
- Built-in validation with Zod

## File Structure

```
RichEditor/
├── richeditor.types.ts    # TypeScript type definitions
├── richeditor.builder.ts  # Fluent API builder for field configuration
├── richeditor.field.tsx   # React component that renders the PlateJS editor
└── richeditor.zod.ts      # Zod validation schema converter
```

## Usage

### Basic Example

```typescript
import { RichEditor } from '../fields';
import { createSchema } from '../builders/SchemaBuilder';

export const BlogPostSchema = createSchema(
  'Blog Post',
  [
    RichEditor('content')
      .label('Post Content')
      .description('The main content of your blog post')
      .placeholder('Start writing...')
      .required()
      .maxLength(5000),
  ],
  'Blog post schema',
  'blog-post'
);
```

### Advanced Example with Validation

```typescript
RichEditor('description')
  .label('Product Description')
  .description('Detailed product information with formatting')
  .placeholder('Describe your product...')
  .required()
  .minLength(100)    // Minimum 100 characters
  .maxLength(2000)   // Maximum 2000 characters
  .variant('default')
```

## Builder API

The `RichEditor` builder provides the following methods:

- **`.label(string)`** - Set the field label
- **`.description(string)`** - Set the field description (help text)
- **`.placeholder(string)`** - Set the placeholder text
- **`.required(boolean)`** - Mark the field as required (default: true)
- **`.defaultValue(any)`** - Set the default value (PlateJS value structure)
- **`.minLength(number)`** - Set minimum character count
- **`.maxLength(number)`** - Set maximum character count
- **`.variant(string)`** - Set the editor variant ('default' | 'demo' | 'comment' | 'select')
- **`.features(features[])`** - Enable only specific features
- **`.disableFeatures(features[])`** - Disable specific features from defaults
- **`.enableAllFeatures()`** - Enable all available features
- **`.disableAllFeatures()`** - Disable all features (plain text editor)

## Feature Configuration

You can customize which features are enabled in the editor for better performance and cleaner UI.

### Enable Specific Features

```typescript
RichEditor('content')
  .features([
    'bold', 'italic', 'link', 'bulletList', 'orderedList', 'fixedToolbar'
  ])
  .build();
```

### Enable All Features Except Some

Perfect for when you want most features but need to disable a few:

```typescript
RichEditor('content')
  .enableAllFeatures()
  .disableFeatures(['table', 'math', 'toc', 'column'])
  .build();
```

### Disable Specific Features

Starts with default features and removes the specified ones:

```typescript
RichEditor('content')
  .disableFeatures(['table', 'codeBlock', 'image'])
  .build();
```

### Disable All Features (Plain Text)

```typescript
RichEditor('notes')
  .disableAllToolbarButtons()
  .build();
```

### Available Features

**Basic Marks**: `bold`, `italic`, `underline`, `strikethrough`, `code`, `highlight`, `subscript`, `superscript`, `kbd`

**Font**: `fontSize`, `fontFamily`, `fontColor`, `fontBackgroundColor`

**Layout**: `align`, `lineHeight`

**Blocks**: `heading`, `paragraph`, `blockquote`, `horizontalRule`

**Lists**: `bulletList`, `orderedList`, `todoList`

**Advanced**: `codeBlock`, `table`, `callout`, `column`, `toggle`, `math`, `date`, `toc`

**Media**: `image`, `media`

**Links**: `link`, `mention`

**Collaboration**: `discussion`, `comment`, `suggestion`

> **Note**: When you enable `comment` or `suggestion` features, the `discussion` plugin is automatically included as it provides the UI popover/panel for displaying comments and suggestions.

**Editing**: `slash`, `autoformat`, `cursorOverlay`, `blockMenu`, `dnd`, `emoji`, `exitBreak`, `trailingBlock`

**UI**: `blockPlaceholder`, `fixedToolbar`, `floatingToolbar`

### Common Patterns

**Blog Editor**
```typescript
RichEditor('content')
  .toolbarButtons([
    'bold', 'italic', 'link', 'heading', 'paragraph',
    'blockquote', 'bulletList', 'orderedList', 'image'
  ])
  .build();
```

**Comment Field**
```typescript
RichEditor('comment')
  .variant('comment')
  .toolbarButtons(['bold', 'italic', 'link', 'code'])
  .maxLength(2000)
  .build();
```

**Documentation Editor**
```typescript
RichEditor('docs')
  .toolbarButtons([
    'bold', 'italic', 'code', 'heading', 'codeBlock',
    'table', 'link', 'bulletList', 'todoList'
  ])
  .build();
```

**Performance Benefits**: Only the configured features are loaded, reducing bundle size and improving performance. A minimal editor can be ~50KB smaller than the full editor.

For more details, see [RICHEDITOR_TOOLBAR_CONFIG.md](../../../../docs/RICHEDITOR_TOOLBAR_CONFIG.md).

## Data Format

The RichEditor stores data in PlateJS's node format (array of nodes):

```json
[
  {
    "type": "p",
    "children": [
      { "text": "This is a paragraph with " },
      { "text": "bold text", "bold": true }
    ]
  },
  {
    "type": "h2",
    "children": [{ "text": "A Heading" }]
  }
]
```

## Validation

The field supports:
- **Required validation** - Ensures the field is not empty
- **Min/Max length** - Validates character count (counts text content, not markup)
- **Type validation** - Ensures the value is a valid PlateJS node array

## PlateJS Features

The RichEditor includes extensive features from PlateJS:

- **Basic formatting**: Bold, italic, underline, strikethrough
- **Headings**: H1, H2, H3, etc.
- **Lists**: Bulleted and numbered lists
- **Links**: Insert and edit hyperlinks
- **Images & Media**: Upload and embed images, videos, audio
- **Tables**: Create and edit tables
- **Code blocks**: Syntax-highlighted code blocks
- **Blockquotes**: Quote formatting
- **Comments & Suggestions**: Collaborative editing features
- **And much more...**

## Notes

- The editor uses the `EditorKit` configuration from PlateJS
- Character count is calculated from text content only (excludes markup)
- The editor is client-side only (`'use client'` directive)
- Fully integrated with Capsulo's validation system

## See Also

- [PlateJS Documentation](https://platejs.org/docs)
- [Capsulo CMS Vision](../../../docs/CMS_VISION.md)
- [Schema Props Guide](../../../docs/SCHEMA_PROPS_GUIDE.md)
