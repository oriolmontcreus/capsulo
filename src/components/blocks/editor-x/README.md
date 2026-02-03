# Rich Editor Components

## EditorRenderer

A production-ready component for rendering Lexical editor state as HTML.

### Usage

```tsx
import { EditorRenderer } from '@/components/blocks/editor-x/editor-renderer';

// Basic usage
<EditorRenderer 
  editorState={richTextData} 
  className="prose prose-lg max-w-none"
/>

// With fallback for empty content
<EditorRenderer 
  editorState={richTextData}
  className="prose prose-lg max-w-none"
  fallback="<p>No content available</p>"
/>

// In Astro components (client-side rendering)
<EditorRenderer 
  editorState={richTextData}
  className="prose prose-lg max-w-none"
  client:load
/>
```

### Props

- `editorState`: SerializedEditorState | null - The Lexical editor state to render
- `className`: string - CSS classes to apply to the rendered content
- `fallback`: string - HTML to show when editorState is empty or null

### Performance Notes

- Uses `useMemo` to prevent unnecessary re-renders
- Creates editor instance only when needed
- Handles errors gracefully with fallback content
- Optimized for production use

### Integration with CMS

The EditorRenderer is designed to work seamlessly with your CMS:

1. Store the editor state as JSON in your content files
2. Pass the stored state to EditorRenderer
3. The component handles all the conversion to clean HTML
4. Style with Tailwind's prose classes for beautiful typography

### Example CMS Integration

```tsx
// In your CMS form field
const [editorState, setEditorState] = useState();

<Editor onSerializedChange={setEditorState} />

// In your content display
<EditorRenderer 
  editorState={savedEditorState}
  className="prose prose-lg prose-gray dark:prose-invert max-w-none"
/>
```