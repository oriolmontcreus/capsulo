# Rendering RichEditor Content

This guide explains how to display RichEditor content from your CMS on your Astro website.

## Overview

The `RichEditorRenderer` component is a **read-only** renderer that displays rich text content created in the CMS admin panel using the RichEditor field.

## Quick Start

### 1. Import the Component

```astro
---
import RichEditorRenderer from "@/components/RichEditorRenderer";
---
```

### 2. Render Your Content

```astro
<RichEditorRenderer 
    value={yourRichTextData} 
    client:load 
/>
```

> **Note**: The `RichEditorRenderer` uses PlateJS's HTML serialization to convert rich text nodes into clean, semantic HTML. This provides better performance and SEO compared to rendering React components.

## Complete Example

Here's how to render rich text in your Hero component:

```astro
---
import { HeroSchema } from "../lib/form-builder/schemas/hero.schema";
import RichEditorRenderer from "./RichEditorRenderer";
import type { SchemaProps } from "../lib/schema-props";

export type Props = SchemaProps<typeof HeroSchema>;
const { title, subtitle, description } = Astro.props;
---

<section>
    <h1>{title}</h1>
    {subtitle && <p>{subtitle}</p>}
    
    {description && (
        <div class="rich-content">
            <RichEditorRenderer 
                value={description}
                client:load 
            />
        </div>
    )}
</section>
```

> **Note**: The `RichEditorRenderer` automatically extracts the `content` from the RichEditor's `{content: [...], discussions: [...]}` format. You can pass the raw value directly!

## How It Works

The `RichEditorRenderer` component uses PlateJS's `serializeHtml()` function to convert rich text nodes into clean, semantic HTML. This approach:

- **Better Performance**: Renders as static HTML instead of React components
- **Better SEO**: Search engines can easily index the content
- **Lighter Bundle**: No need to load all the editor components on the frontend
- **Clean Markup**: Produces semantic HTML without unnecessary wrappers

## Props

### `value`
- **Type:** PlateJS value format (array of nodes)
- **Required:** Yes
- **Description:** The rich text content from your CMS

The value is an array of nodes in PlateJS format:
```typescript
[
  {
    type: "p",
    children: [
      { text: "Plain text with " },
      { text: "bold", bold: true },
      { text: " and " },
      { text: "italic", italic: true }
    ]
  },
  {
    type: "h2",
    children: [{ text: "A Heading" }]
  }
]
```

### `className`
- **Type:** `string`
- **Optional**
- **Description:** Additional CSS classes for custom styling

**Note**: The `variant` prop has been removed. The component now renders clean HTML that you can style with CSS classes.

## Common Usage Patterns

### Blog Post Content

```astro
---
import RichEditorRenderer from "@/components/RichEditorRenderer";
import { loadPageData, getComponentDataByKey } from "@/lib/cms-loader";

const pageData = await loadPageData("blog-post");
const postData = getComponentDataByKey(pageData, "blog-post");
---

<article>
    <h1>{postData.title}</h1>
    
    <div class="prose prose-lg max-w-4xl mx-auto dark:prose-invert">
        <RichEditorRenderer 
            value={postData.content}
            client:load 
        />
    </div>
</article>
```

### Product Description

```astro
<div class="product-description prose">
    <RichEditorRenderer 
        value={product.description}
        client:load 
    />
</div>
```

### Conditional Rendering

```astro
{description && (
    <RichEditorRenderer 
        value={description}
        client:load 
    />
)}
```

## Client Directives

Since `RichEditorRenderer` is a React component with `'use client'`, you need to use one of Astro's client directives:

### `client:load` (Recommended)
Loads the component immediately on page load:
```astro
<RichEditorRenderer value={content} client:load />
```

### `client:visible`
Loads when the component becomes visible in the viewport (lazy loading):
```astro
<RichEditorRenderer value={content} client:visible />
```

### `client:idle`
Loads after the page is fully loaded and the browser is idle:
```astro
<RichEditorRenderer value={content} client:idle />
```

## Styling

### Using Tailwind Prose

The `@tailwindcss/typography` plugin works great with the HTML output:

```astro
<div class="prose prose-lg dark:prose-invert max-w-none">
    <RichEditorRenderer 
        value={content}
        client:load 
    />
</div>
```

### Custom CSS

Style the rendered HTML with CSS:

```astro
<style>
    .rich-editor-content {
        font-size: 1.125rem;
        line-height: 1.75;
    }
    
    .rich-editor-content h2 {
        font-size: 2rem;
        margin-top: 2rem;
        margin-bottom: 1rem;
    }
    
    .rich-editor-content p {
        margin-bottom: 1rem;
    }
    
    .rich-editor-content a {
        color: #3b82f6;
        text-decoration: underline;
    }
    
    .rich-editor-content strong {
        font-weight: 700;
    }
</style>

<RichEditorRenderer 
    value={content}
    className="my-custom-class"
    client:load 
/>
```

## Supported Features

The `RichEditorRenderer` supports all PlateJS features used in the editor:

- **Text formatting:** Bold, italic, underline, strikethrough, code
- **Headings:** H1, H2, H3, H4, H5, H6
- **Lists:** Bulleted lists, numbered lists, todo lists
- **Links:** Hyperlinks with proper rendering
- **Media:** Images, videos, files
- **Tables:** Fully formatted tables
- **Code blocks:** Syntax-highlighted code
- **Blockquotes:** Quote formatting
- **Math equations:** KaTeX rendering
- **Callouts:** Special highlighted blocks
- **Columns:** Multi-column layouts
- **And more...**

## Performance Tips

### 1. Use `client:visible` for Below-the-Fold Content

```astro
<RichEditorRenderer 
    value={longContent}
    client:visible 
/>
```

### 2. Minimal Features for Simple Content

If your content only uses basic formatting, you can create a lightweight version of the renderer with fewer plugins.

### 3. Static Site Generation (SSG)

Since Astro generates static HTML, the rich content is rendered at build time, providing excellent performance.

## Troubleshooting

### Content Not Displaying

1. **Verify the data:** Use `console.log(description)` to inspect the data structure
   ```astro
   ---
   console.log('Description:', description);
   ---
   ```

2. **Check for empty content:** Make sure the content array has data
   ```astro
   {description && <RichEditorRenderer value={description} client:load />}
   ```

3. **The component handles both formats automatically:**
   - `{content: [...], discussions: [...]}` ✅ Works!
   - `[...]` ✅ Works too!

### Styling Issues

1. **Use `variant="none"`** for full control over styling
2. **Add custom CSS classes** via the `className` prop
3. **Use Tailwind's `@apply`** or global styles

### TypeScript Errors

Import the correct type:
```typescript
import type { Value } from '@platejs/core';
```

## Example Schema

Make sure your schema includes the RichEditor field:

```tsx
import { RichEditor } from '../fields';
import { createSchema } from '../builders/SchemaBuilder';

export const HeroSchema = createSchema(
  'Hero',
  [
    RichEditor('description')
      .label('Rich Description')
      .description('A detailed description with rich text formatting')
      .placeholder('Enter a detailed description...')
      .enableAllFeatures()
      .maxLength(1000),
  ],
  'Hero section schema',
  'hero'
);
```

## See Also

- [RichEditor Field Documentation](../lib/form-builder/fields/RichEditor/README.md)
- [PlateJS Documentation](https://platejs.org/docs)
- [Astro Client Directives](https://docs.astro.build/en/reference/directives-reference/#client-directives)
