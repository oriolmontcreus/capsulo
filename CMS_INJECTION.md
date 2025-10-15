# CMS Data Injection Guide

This guide explains how to inject CMS-managed data into your Astro components.

## Overview

The CMS data injection system allows you to manage component content through the Capsulo CMS while keeping your component structure in code. It follows a page-based architecture where CMS data is loaded at the page level and passed to components via props.

## How It Works

1. **Schemas with Keys**: Each CMS schema has a unique `key` that identifies it
2. **Page-Level Loading**: CMS data is loaded in Astro page files
3. **Component Injection**: Data is passed to components as props
4. **Automatic Mapping**: The system automatically maps CMS data to component props

## Setting Up a Schema

When creating a schema, provide a unique key as the fourth parameter:

```typescript
import { Input, Textarea, Select } from '../fields';
import { createSchema } from '../builders/SchemaBuilder';

export const HeroSchema = createSchema(
  'Hero',                    // Schema name
  [                          // Fields array
    Input('title')
      .label('Hero title')
      .required()
      .placeholder('Enter the main title'),
    
    Textarea('subtitle')
      .label('Subtitle')
      .placeholder('Supporting text'),
    
    Input('ctaButton')
      .label('CTA text')
      .placeholder('Get Started'),
  ],
  'Main hero section',       // Description
  'hero'                     // Unique key for CMS injection ✨
);
```

**Important**: The `key` must be unique across all schemas. Use lowercase, descriptive names like:
- `hero`
- `footer`
- `about-section`
- `pricing-table`

## Loading CMS Data in Pages

In your Astro page files, use the CMS loader utilities:

```astro
---
import Hero from '@/components/Hero.astro';
import { loadPageData, getComponentDataByKey } from '@/lib/cms-loader';

// Load CMS data for this page (matches filename without extension)
const pageData = await loadPageData('index');

// Get component data using the schema key
const heroData = getComponentDataByKey(pageData, 'hero');
const footerData = getComponentDataByKey(pageData, 'footer');
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <title>My Page</title>
  </head>
  <body>
    <!-- Pass CMS data to components via props -->
    <Hero 
      title={heroData?.title}
      subtitle={heroData?.subtitle}
      ctaButton={heroData?.ctaButton}
      ctaLink="/get-started"
    />
    
    <Footer 
      companyName={footerData?.companyName}
      email={footerData?.email}
      phone={footerData?.phone}
    />
  </body>
</html>
```

## Creating CMS-Compatible Components

Components should define props with optional defaults:

```astro
---
// src/components/Hero.astro
export interface Props {
  title?: string;
  subtitle?: string;
  ctaButton?: string;
  ctaLink?: string;
}

const {
  title = 'Default Title',
  subtitle = 'Default subtitle',
  ctaButton = 'Get Started',
  ctaLink = '#'
} = Astro.props;
---

<section>
  <h1>{title}</h1>
  <p>{subtitle}</p>
  <a href={ctaLink}>{ctaButton}</a>
</section>
```

## API Reference

### `loadPageData(pageName: string)`

Loads all CMS data for a specific page.

**Parameters:**
- `pageName`: The page identifier (e.g., 'index', 'about', 'contact')

**Returns:** `Promise<PageData | null>`

**Example:**
```typescript
const pageData = await loadPageData('index');
```

### `getComponentDataByKey(pageData, schemaKey)`

Extracts data for a specific component using its schema key.

**Parameters:**
- `pageData`: The page data returned from `loadPageData()`
- `schemaKey`: The unique schema key (e.g., 'hero', 'footer')

**Returns:** `Record<string, any> | null`

**Example:**
```typescript
const heroData = getComponentDataByKey(pageData, 'hero');
// Returns: { title: "Welcome", subtitle: "...", ctaButton: "..." }
```

### `getAllComponentsData(pageData)`

Gets all components data organized by schema key.

**Parameters:**
- `pageData`: The page data returned from `loadPageData()`

**Returns:** `Record<string, Record<string, any>>`

**Example:**
```typescript
const allData = getAllComponentsData(pageData);
// Returns: {
//   hero: { title: "...", subtitle: "..." },
//   footer: { companyName: "...", email: "..." }
// }
```

## Page Naming Convention

The `pageName` parameter in `loadPageData()` should match your Astro page filename without the extension:

- `src/pages/index.astro` → `loadPageData('index')`
- `src/pages/about.astro` → `loadPageData('about')`
- `src/pages/contact.astro` → `loadPageData('contact')`

## Data Flow

```
┌─────────────────┐
│  CMS Manager    │
│  (Admin Panel)  │
└────────┬────────┘
         │ Save
         ▼
┌─────────────────────────────┐
│  GitHub Repository          │
│  src/content/pages/         │
│  └── index.json             │
└────────┬────────────────────┘
         │ Load
         ▼
┌─────────────────────────────┐
│  Astro Page                 │
│  - loadPageData()           │
│  - getComponentDataByKey()  │
└────────┬────────────────────┘
         │ Props
         ▼
┌─────────────────────────────┐
│  Component                  │
│  - Renders with CMS data    │
└─────────────────────────────┘
```

## Best Practices

### 1. Always Use Optional Props
Since CMS data might not exist initially, make all props optional with defaults:

```typescript
const { title = 'Default' } = Astro.props;
```

### 2. Use Null-Safe Access
When passing data to components, use optional chaining:

```astro
<Hero title={heroData?.title} />
```

### 3. Provide Fallback Content
Components should work even without CMS data:

```astro
---
const { title = 'Welcome' } = Astro.props;
---
<h1>{title}</h1>
```

### 4. Keep Schema Keys Consistent
Use a naming convention for schema keys:
- Lowercase
- Hyphen-separated for multi-word keys
- Descriptive of the component purpose

### 5. Handle Missing Data Gracefully
Check if data exists before rendering optional sections:

```astro
{subtitle && <p>{subtitle}</p>}
```

## Example: Complete Integration

### 1. Define Schema
```typescript
// src/lib/form-builder/schemas/hero.schema.ts
export const HeroSchema = createSchema(
  'Hero',
  [
    Input('title').label('Title').required(),
    Textarea('subtitle').label('Subtitle'),
  ],
  'Hero section',
  'hero'  // ← Unique key
);
```

### 2. Register Schema
```typescript
// src/lib/form-builder/schemas/index.ts
import { registerSchema } from '../core/schemaRegistry';
import { HeroSchema } from './hero.schema';

registerSchema(HeroSchema);

export const schemas = { HeroSchema };
```

### 3. Create Component
```astro
---
// src/components/Hero.astro
export interface Props {
  title?: string;
  subtitle?: string;
}

const {
  title = 'Welcome',
  subtitle
} = Astro.props;
---

<section>
  <h1>{title}</h1>
  {subtitle && <p>{subtitle}</p>}
</section>
```

### 4. Use in Page
```astro
---
// src/pages/index.astro
import Hero from '@/components/Hero.astro';
import { loadPageData, getComponentDataByKey } from '@/lib/cms-loader';

const pageData = await loadPageData('index');
const heroData = getComponentDataByKey(pageData, 'hero');
---

<Hero 
  title={heroData?.title}
  subtitle={heroData?.subtitle}
/>
```

### 5. Manage in CMS
1. Go to `/admin`
2. Select the "index" page
3. Add or edit the "Hero" component
4. Fill in the fields
5. Save changes
6. The data automatically appears on your page!

## Troubleshooting

### Component Data Not Loading

**Check:**
1. Schema has a unique `key` defined
2. Schema is registered in `schemas/index.ts`
3. Page name matches the file name
4. Component exists in the CMS for that page

### Data Shows Old Values

**Solution:** The system checks for draft changes first. Make sure to publish your changes in the CMS.

### TypeScript Errors

**Ensure:**
1. Props interface matches schema fields
2. Props are optional (`title?: string`)
3. Using optional chaining when passing props

## Advanced: TypeScript Types

For better type safety, you can create typed interfaces:

```typescript
// src/types/cms.ts
export interface HeroProps {
  title?: string;
  subtitle?: string;
  ctaButton?: string;
  ctaLinkType?: 'internal' | 'external';
  ctaLink?: string;
}
```

Then use in your component:

```astro
---
import type { HeroProps } from '@/types/cms';

export interface Props extends HeroProps {}

const props = Astro.props;
---
```

## Summary

The CMS injection system provides a clean separation between content and structure:

- ✅ Content managed through CMS
- ✅ Component structure in code
- ✅ Type-safe with TypeScript
- ✅ Automatic data mapping
- ✅ Draft/publish workflow
- ✅ No component coupling to CMS

This approach gives you the flexibility of a headless CMS while maintaining full control over your component architecture.
