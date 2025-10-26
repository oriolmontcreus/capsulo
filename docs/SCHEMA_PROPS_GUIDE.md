# Schema-Based Component Props

## Overview

Components now automatically infer their props from schemas using Zod validation. No more manual prop definitions!

## Benefits

✅ **Automatic type inference** - Props are automatically typed from your schema  
✅ **Zod validation** - Built-in validation with helpful error messages  
✅ **Default values** - Set defaults in the schema, not the component  
✅ **Single source of truth** - Schema defines both CMS fields and component props  
✅ **Type safety** - Full TypeScript support with autocomplete  

## How It Works

### Before (Manual ❌)

```astro
---
export interface Props {
    title?: string;
    subtitle?: string;
    ctaButton?: string;
    ctaLinkType?: "internal" | "external";
    ctaLink?: string;
}

const {
    title = "Welcome",
    subtitle = "Default subtitle",
    ctaButton = "Click me",
    ctaLinkType = "internal",
    ctaLink = "/admin",
} = Astro.props;
---

<div>{title}</div>
```

**Problems:**
- ❌ Props defined twice (schema + component)
- ❌ Defaults defined twice
- ❌ Easy to get out of sync
- ❌ No validation

### After (Automatic ✅)

```astro
---
import { getSchemaProps } from '@/lib/schema-props';
import { HeroSchema } from '@/lib/form-builder/schemas/hero.schema';
import type { SchemaProps } from '@/lib/schema-props';

export type Props = SchemaProps<typeof HeroSchema>;

// Automatically get props with validation and defaults
const props = getSchemaProps(HeroSchema, Astro.props);
const { title, subtitle, ctaButton, ctaLinkType, ctaLink } = props;
---

<div>{title}</div>
```

**Benefits:**
- ✅ Props automatically inferred from schema
- ✅ Defaults come from schema
- ✅ Automatic Zod validation
- ✅ Single source of truth
- ✅ Type safe with autocomplete

## Creating a Schema-Based Component

### Step 1: Create Schema with Defaults

```typescript
// src/lib/form-builder/schemas/mycomponent.schema.tsx
import { Input, Textarea, Select } from '../fields';
import { createSchema } from '../builders/SchemaBuilder';

export const MyComponentSchema = createSchema(
  'MyComponent',
  [
    Input('title')
      .label('Title')
      .required()
      .defaultValue('Default Title'), // ← Set default here!
    
    Textarea('description')
      .label('Description')
      .defaultValue('Default description'),
    
    Select('variant')
      .label('Style Variant')
      .options([
        { label: 'Primary', value: 'primary' },
        { label: 'Secondary', value: 'secondary' },
      ])
      .defaultValue('primary'),
  ],
  'My awesome component',
  'mycomponent'  // ← Unique key for CMS injection
);
```

### Step 2: Create Component

```astro
---
// src/components/MyComponent.astro
import { getSchemaProps } from '@/lib/schema-props';
import { MyComponentSchema } from '@/lib/form-builder/schemas/mycomponent.schema';
import type { SchemaProps } from '@/lib/schema-props';

export type Props = SchemaProps<typeof MyComponentSchema>;

// Get validated props with defaults
const props = getSchemaProps(MyComponentSchema, Astro.props);
const { title, description, variant } = props;
---

<div class={`component-${variant}`}>
  <h2>{title}</h2>
  <p>{description}</p>
</div>
```

### Step 3: That's It! 🎉

The schema is automatically discovered and registered. No manual imports needed!

## Validation

Zod automatically validates props based on field configuration:

```typescript
Input('email')
  .type('email')       // ← Validates email format
  .required()          // ← Ensures field is provided

Textarea('bio')
  .maxLength(500)      // ← Validates max length

Select('color')
  .options([
    { label: 'Red', value: 'red' },
    { label: 'Blue', value: 'blue' },
  ])                   // ← Validates against valid options
```

## Default Values

Set defaults in the schema, not the component:

```typescript
// ✅ Good - Defaults in schema
Input('name')
  .defaultValue('Guest User')

// ❌ Bad - Don't set defaults in component anymore
const { name = 'Guest User' } = Astro.props;
```

**Why?** Defaults in the schema ensure:
- CMS shows the default value in the form
- Type inference knows the field always has a value
- Single source of truth for default values
- Consistency across all component instances

## Type Safety

Full TypeScript support with explicit type inference:

```astro
---
import { getSchemaProps } from '@/lib/schema-props';
import { HeroSchema } from '@/lib/form-builder/schemas/hero.schema';
import type { SchemaProps } from '@/lib/schema-props';

export type Props = SchemaProps<typeof HeroSchema>;
// ↑ Props are now fully typed based on your schema fields!

const props = getSchemaProps(HeroSchema, Astro.props);
const { title, subtitle } = props;
// ↑ All properly typed with autocomplete!
---
```

### Type Inference Logic

The type system uses the **`.required()`** flag to determine optionality:

| Schema Configuration | Inferred Type | Reason |
|---------------------|---------------|---------|
| `.required()` | `string` | Must be provided, never undefined |
| No `.required()` | `string \| undefined` | Optional, can be undefined |

**This gives you explicit control over which fields can be undefined.**

**Examples:**

```typescript
// Schema definition → Type

Input('title')
  .required()           // → string (never undefined)

Input('subtitle')       // → string | undefined (optional)

Input('description')
  .required()
  .defaultValue('Hi')   // → string (required means never undefined)

Textarea('bio')         // → string | undefined (not required)

Select('color')
  .options([...])
  .required()           // → string (never undefined)

Select('tags')
  .options([...])
  .multiple()           // → string[] | undefined (array, but optional)

Select('categories')
  .options([...])
  .multiple()
  .required()           // → string[] (array, required)
```

### Type Features

The type system automatically:
- ✅ Infers `string` for Input and Textarea fields
- ✅ Infers `string` for single Select fields
- ✅ Infers `string[]` for multiple Select fields
- ✅ Adds `| undefined` only when field is NOT `.required()`
- ✅ Gives you explicit control via `.required()` flag
- ✅ Provides full autocomplete in your IDE

### Controlling Optionality

**Want a field to never be undefined?** Add `.required()`:
```typescript
Input('title').required()  // → Type: string
```

**Want a field to be optional?** Don't add `.required()`:
```typescript
Input('subtitle')  // → Type: string | undefined
```

**Note:** Even optional fields get default values at runtime (empty string, first option, etc.), but TypeScript will still enforce proper null checking for safety. You can also set explicit defaults using `.defaultValue()` in your schema.

## Error Handling

If validation fails, you'll see helpful console warnings:

```
Schema validation failed for Hero:
{
  email: { _errors: ['Invalid email'] }
}
```

The component will still render with the raw props to prevent breaking the page, but you should fix the validation errors.

## Best Practices

### 1. Set Defaults in Schema
```typescript
// ✅ Good - Defaults in schema
Input('name')
  .defaultValue('Guest User')

// ❌ Bad - Don't do this
const { name = 'Guest User' } = props;
```

### 2. Use Spread Operator for CMS Data
```astro
---
import { loadPageData, getComponentDataByKey } from '@/lib/cms-loader';

const pageData = await loadPageData('index');
const heroData = getComponentDataByKey(pageData, 'hero');
---

<!-- ✅ Good - Clean and automatic -->
<Hero {...heroData} />

<!-- ❌ Bad - Manual and verbose -->
<Hero 
  title={heroData?.title}
  subtitle={heroData?.subtitle}
/>
```

### 3. Handle Optional Fields
```astro
{subtitle && <p>{subtitle}</p>}
```

## Example Components

See these components for reference:
- `src/components/Hero.astro` - Complete example with tabs layout

## Migration Guide

To migrate an existing component:

1. **Add defaults to schema**
   ```typescript
   Input('title')
     .defaultValue('My Default')
   ```

2. **Update component imports**
   ```astro
   ---
   import { getSchemaProps } from '@/lib/schema-props';
   import { YourSchema } from '@/lib/form-builder/schemas/your.schema';
   import type { SchemaProps } from '@/lib/schema-props';
   
   export type Props = SchemaProps<typeof YourSchema>;
   const props = getSchemaProps(YourSchema, Astro.props);
   const { field1, field2 } = props;
   ---
   ```

3. **Remove manual props definition**
   ```diff
   - export interface Props {
   -   field1?: string;
   -   field2?: string;
   - }
   - 
   - const {
   -   field1 = "default",
   -   field2 = "default"
   - } = Astro.props;
   ```

Done! 🚀

## Summary

The schema-based props system provides:

✅ **Automatic type inference** via `SchemaProps<T>`  
✅ **Runtime validation** via Zod  
✅ **Single source of truth** - schema defines everything  
✅ **Default values** - set in schema, not component  
✅ **Developer experience** - full autocomplete and type safety  

This eliminates duplicate definitions and keeps your components in sync with your schemas automatically!
