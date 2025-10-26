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
// src/lib/form-builder/schemas/hero.schema.tsx
import { Input, Textarea, Select } from '../fields';
import { createSchema } from '../builders/SchemaBuilder';

export const HeroSchema = createSchema(
  'Hero',                    // Schema name (displayed in CMS)
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

**Important Notes:**
- The `key` must be unique across all schemas
- Use lowercase, descriptive names: `hero`, `footer`, `about-section`, `pricing-table`
- Schemas are **auto-discovered** - just create the file, no manual registration needed!
- File naming: `{name}.schema.tsx` (e.g., `hero.schema.tsx`, `footer.schema.tsx`)

## Loading CMS Data in Pages

In your Astro page files, use the CMS loader utilities:

```astro
---
// src/pages/index.astro
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
    <!-- Pass CMS data to components using spread operator -->
    <Hero {...heroData} />
    
    <Footer {...footerData} />
  </body>
</html>
```

**Note:** The spread operator (`{...heroData}`) automatically maps all CMS fields to component props.

## Creating CMS-Compatible Components

Components should use the `SchemaProps` type helper for automatic type inference and the `getSchemaProps()` function for validation:

```astro
---
// src/components/Hero.astro
import { getSchemaProps } from '@/lib/schema-props';
import { HeroSchema } from '@/lib/form-builder/schemas/hero.schema';
import type { SchemaProps } from '@/lib/schema-props';

// Automatically infer prop types from schema
export type Props = SchemaProps<typeof HeroSchema>;

// Validate and parse props with Zod
const props = getSchemaProps(HeroSchema, Astro.props);

// Destructure with defaults
const {
  title = 'Default Title',
  subtitle = 'Default subtitle',
  ctaButton = 'Get Started',
  ctaLink = '#'
} = props;
---

<section>
  <h1>{title}</h1>
  {subtitle && <p>{subtitle}</p>}
  <a href={ctaLink}>{ctaButton}</a>
</section>
```

**Benefits of this approach:**
- ✅ **Type safety** - Props are automatically typed from the schema
- ✅ **Validation** - Props are validated with Zod at runtime
- ✅ **Single source of truth** - Schema defines both CMS fields and component props
- ✅ **Auto-completion** - Full TypeScript intellisense support

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

### 1. Use SchemaProps for Type Safety
Let TypeScript infer your props from the schema instead of manually defining them:

```typescript
// ✅ GOOD - Types automatically match schema
export type Props = SchemaProps<typeof HeroSchema>;

// ❌ BAD - Manual types can drift from schema
export interface Props {
  title?: string;
  subtitle?: string;
}
```

### 2. Always Use getSchemaProps()
This validates props at runtime and provides better error messages:

```typescript
// ✅ GOOD - Validated with Zod
const props = getSchemaProps(HeroSchema, Astro.props);

// ❌ BAD - No validation
const props = Astro.props;
```

### 3. Use Spread Operator in Pages
Simplifies prop passing and automatically handles all fields:

```astro
<!-- ✅ GOOD - Clean and automatic -->
<Hero {...heroData} />

<!-- ❌ BAD - Manual and verbose -->
<Hero 
  title={heroData?.title}
  subtitle={heroData?.subtitle}
  ctaButton={heroData?.ctaButton}
/>
```

### 4. Provide Default Values
Components should work even without CMS data:

```typescript
const { title = 'Welcome' } = props;
```

### 5. Keep Schema Keys Consistent
Use a naming convention for schema keys:
- Lowercase
- Hyphen-separated for multi-word keys
- Descriptive of the component purpose

### 6. Handle Optional Fields Gracefully
Check if data exists before rendering optional sections:

```astro
{subtitle && <p>{subtitle}</p>}
```

## Example: Complete Integration

### 1. Define Schema
```typescript
// src/lib/form-builder/schemas/hero.schema.tsx
import { Input, Textarea } from '../fields';
import { createSchema } from '../builders/SchemaBuilder';

export const HeroSchema = createSchema(
  'Hero',
  [
    Input('title').label('Title').required(),
    Textarea('subtitle').label('Subtitle'),
    Input('ctaButton').label('CTA Button'),
  ],
  'Hero section',
  'hero'  // ← Unique key
);
```

### 2. Schemas Auto-Register
No manual registration needed! Schemas are automatically discovered from the `schemas/` directory using `import.meta.glob`:

```typescript
// src/lib/form-builder/schemas/index.ts
// Auto-discovery happens automatically - just create your schema file!
const schemaModules = import.meta.glob('./*.schema.{ts,tsx}', { eager: true });
```

### 3. Create Component
```astro
---
// src/components/Hero.astro
import { getSchemaProps } from '@/lib/schema-props';
import { HeroSchema } from '@/lib/form-builder/schemas/hero.schema';
import type { SchemaProps } from '@/lib/schema-props';

export type Props = SchemaProps<typeof HeroSchema>;

const props = getSchemaProps(HeroSchema, Astro.props);

const {
  title = 'Welcome',
  subtitle,
  ctaButton
} = props;
---

<section>
  <h1>{title}</h1>
  {subtitle && <p>{subtitle}</p>}
  {ctaButton && <button>{ctaButton}</button>}
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

<Hero {...heroData} />
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

**Solution:** The CMS automatically checks for draft changes first, then falls back to published data. Make sure to:
1. Save your changes in the CMS
2. Publish your changes (merges draft branch to main)
3. Refresh your page

### TypeScript Errors

**Ensure:**
1. Using `SchemaProps<typeof YourSchema>` for type inference
2. Using `getSchemaProps()` to validate props
3. Schema fields match component usage
4. Optional fields have default values or conditional rendering

## Advanced: TypeScript Types

The system provides powerful type inference from schemas:

```typescript
// src/lib/schema-props.ts

/**
 * Automatically infer prop types from a schema
 * 
 * This type helper:
 * - Extracts all field names and types from your schema
 * - Makes fields optional/required based on .required()
 * - Handles different field types (input, textarea, select, etc.)
 * - Provides full TypeScript intellisense
 */
export type SchemaProps<T extends Schema> = {
  [K in T['fields'][number] as K['name']]: OptionalIfNotRequired<K>
};

/**
 * Validate props with Zod at runtime
 * 
 * This function:
 * - Validates all props against the schema
 * - Provides helpful error messages for invalid data
 * - Returns typed props for use in your component
 * - Ensures runtime safety beyond TypeScript
 */
export function getSchemaProps<T extends Schema>(
  schema: T,
  astroProps: Record<string, any>
): SchemaProps<T>
```

**Usage in components:**

```astro
---
import { HeroSchema } from '@/lib/form-builder/schemas/hero.schema';
import type { SchemaProps } from '@/lib/schema-props';

// ✅ Type-safe props automatically inferred from schema
export type Props = SchemaProps<typeof HeroSchema>;

const props = getSchemaProps(HeroSchema, Astro.props);
// props is now fully typed with:
// - title: string
// - subtitle?: string | undefined
// - ctaButton?: string | undefined
// etc.
---
```

**Benefits:**
- ✅ Single source of truth (schema defines everything)
- ✅ No manual prop type definitions needed
- ✅ Runtime validation with Zod
- ✅ Full TypeScript support and autocomplete
- ✅ Automatically handles required vs optional fields

## Summary

The CMS injection system provides a clean separation between content and structure:

- ✅ **Content managed through CMS** - Non-technical users can edit
- ✅ **Component structure in code** - Developers maintain control
- ✅ **Type-safe with TypeScript** - `SchemaProps` auto-infers types
- ✅ **Runtime validation** - `getSchemaProps()` validates with Zod
- ✅ **Auto-discovery** - Schemas register automatically
- ✅ **Automatic data mapping** - Spread operator simplifies prop passing
- ✅ **Draft/publish workflow** - GitHub-based version control
- ✅ **No component coupling to CMS** - Components work standalone

This approach gives you the flexibility of a headless CMS while maintaining full control over your component architecture and ensuring type safety throughout.
