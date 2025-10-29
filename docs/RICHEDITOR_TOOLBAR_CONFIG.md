# Rich Editor Toolbar Configuration

The Rich Editor field supports fine-grained control over which features and toolbar buttons are enabled. This allows you to create custom editors tailored to specific use cases while keeping bundle sizes small and performance optimal.

## Methods

### `toolbarButtons(features: PluginFeature[])`

Explicitly specify which features to enable. Only these features will be loaded.

```typescript
import { RichEditor } from '@/lib/form-builder/fields';

// Minimal editor with only basic formatting
const field = RichEditor('content')
  .label('Article Content')
  .toolbarButtons([
    'bold',
    'italic',
    'underline',
    'link',
    'bulletList',
    'orderedList',
  ])
  .build();
```

### `disableToolbarButtons(features: PluginFeature[])`

Start with all default features and remove specific ones.

```typescript
// Full-featured editor without tables and code blocks
const field = RichEditor('content')
  .label('Blog Post')
  .disableToolbarButtons([
    'table',
    'codeBlock',
    'math',
  ])
  .build();
```

### `disableAllToolbarButtons()`

Create a minimal plain text editor with no toolbar features.

```typescript
// Plain text editor
const field = RichEditor('notes')
  .label('Notes')
  .disableAllToolbarButtons()
  .build();
```

## Available Features

### Basic Marks
- `bold` - Bold text
- `italic` - Italic text
- `underline` - Underlined text
- `strikethrough` - Strikethrough text
- `code` - Inline code
- `subscript` - Subscript text
- `superscript` - Superscript text
- `highlight` - Highlighted text
- `kbd` - Keyboard shortcut styling

### Font Formatting
- `fontSize` - Font size control
- `fontFamily` - Font family selection
- `fontColor` - Text color
- `fontBackgroundColor` - Text background color

### Text Alignment & Spacing
- `align` - Text alignment (left, center, right, justify)
- `lineHeight` - Line height control

### Basic Blocks
- `heading` - Headings (h1-h6)
- `paragraph` - Paragraphs
- `blockquote` - Blockquotes
- `horizontalRule` - Horizontal rules/dividers

### Lists
- `bulletList` - Unordered/bullet lists
- `orderedList` - Ordered/numbered lists
- `todoList` - Todo/checkbox lists

### Advanced Blocks
- `codeBlock` - Code blocks with syntax highlighting
- `table` - Tables
- `callout` - Callout/alert boxes
- `column` - Multi-column layouts
- `toggle` - Collapsible/expandable sections
- `math` - Mathematical equations (LaTeX)
- `date` - Date pickers
- `toc` - Table of contents

### Media
- `image` - Image uploads
- `media` - Video/audio embeds

### Links & References
- `link` - Hyperlinks
- `mention` - User/entity mentions

### Collaboration Features
- `discussion` - Discussion threads
- `comment` - Inline comments
- `suggestion` - Track changes/suggestions

### Editing Features
- `slash` - Slash commands menu
- `autoformat` - Auto-formatting (e.g., markdown shortcuts)
- `cursorOverlay` - Collaborative cursor overlay
- `blockMenu` - Block action menu
- `dnd` - Drag and drop blocks
- `emoji` - Emoji picker
- `exitBreak` - Exit from blocks with Enter
- `trailingBlock` - Always have an empty block at the end

### UI Features
- `blockPlaceholder` - Placeholder text in empty blocks
- `fixedToolbar` - Fixed toolbar at top
- `floatingToolbar` - Floating selection toolbar

## Usage Examples

### Simple Blog Editor
```typescript
const blogEditor = RichEditor('content')
  .label('Blog Post')
  .toolbarButtons([
    'bold',
    'italic',
    'link',
    'heading',
    'paragraph',
    'blockquote',
    'bulletList',
    'orderedList',
    'image',
  ])
  .build();
```

### Code Documentation Editor
```typescript
const docsEditor = RichEditor('documentation')
  .label('Documentation')
  .toolbarButtons([
    'bold',
    'italic',
    'code',
    'heading',
    'paragraph',
    'codeBlock',
    'table',
    'link',
    'bulletList',
    'orderedList',
    'image',
  ])
  .build();
```

### Comment Editor
```typescript
const commentEditor = RichEditor('comment')
  .label('Your Comment')
  .variant('comment')
  .toolbarButtons([
    'bold',
    'italic',
    'link',
    'code',
  ])
  .build();
```

### Full-Featured Editor (Without Collaboration)
```typescript
const fullEditor = RichEditor('content')
  .label('Content')
  .disableToolbarButtons([
    'discussion',
    'comment',
    'suggestion',
    'cursorOverlay',
  ])
  .build();
```

## Performance Benefits

When you specify which features to use, the editor will:

1. **Only import required modules** - Reduces bundle size
2. **Only initialize needed plugins** - Faster load times
3. **Reduce memory footprint** - Better performance
4. **Cleaner UI** - Only show relevant toolbar buttons

For example:
- A minimal editor with just basic formatting might be **~50KB smaller** than the full editor
- Excluding collaboration features can save **~30KB**
- Removing media upload features can save **~20KB**

## Default Features

If you don't specify any configuration, the editor includes these features by default:

```typescript
// Default configuration
[
  'bold', 'italic', 'underline', 'strikethrough', 'code',
  'heading', 'paragraph', 'blockquote', 'horizontalRule',
  'bulletList', 'orderedList',
  'codeBlock', 'table', 'image', 'link',
  'autoformat', 'blockMenu', 'dnd', 'exitBreak', 'trailingBlock',
  'blockPlaceholder', 'floatingToolbar'
]
```

## Notes

- `toolbarButtons`, `disableToolbarButtons`, and `disableAllToolbarButtons` are mutually exclusive
- Setting one will automatically clear the others
- Features are loaded asynchronously - the editor shows a loading state briefly
- Some features may have dependencies on other features (handled automatically)
