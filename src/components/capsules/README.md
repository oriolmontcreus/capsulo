# Capsulo CMS-Managed Components

This folder contains all components that are managed by the Capsulo CMS. Only components in this folder (and its subfolders) will be automatically detected and made available for content editing in the admin interface.

## Folder Structure Convention

Each CMS-managed component must follow this structure:

```
capsulo/
├── component-name/
│   ├── ComponentName.astro     # Component file (can be .astro, .tsx, .jsx, .vue, .svelte, etc...)
│   └── component-name.schema.tsx  # Schema definition (must match folder name)
```

### Important Rules

1. **Folder name** must be in kebab-case (e.g., `hero`, `feature-card`, `contact-form`)
2. **Schema file** must be named `{folder-name}.schema.tsx` (e.g., `hero.schema.tsx`)
3. **Schema key** in `createSchema()` must match the folder name exactly
4. **Component file** can be named anything, but PascalCase is recommended (e.g., `Hero.astro`, `FeatureCard.tsx`)

## Example: Creating a New CMS Component

### 1. Create the Folder Structure

```
src/components/capsulo/
└── hero/
    ├── Hero.astro
    └── hero.schema.tsx
```

### 2. Define the Schema

```typescript
// hero.schema.tsx
import { Input, Textarea } from '../../lib/form-builder/fields';
import { createSchema } from '../../lib/form-builder/builders/SchemaBuilder';

export const HeroSchema = createSchema(
  'Hero',                               // Schema name (shown in CMS)
  [
    Input('title')
      .label('Hero Title')
      .required()
      .translatable()                   // Enables multi-language support
      .placeholder('Enter title'),
    
    Textarea('subtitle')
      .label('Subtitle')
      .rows(3)
      .translatable(),
  ],
  'Main hero section',                  // Description
  'hero',                               // ⚠️ MUST match folder name!
  <IconComponent />,                    // Optional icon
  'purple'                              // Optional theme color
);
```

### 3. Create the Component

```astro
---
// Hero.astro
export interface Props {
  title?: string;
  subtitle?: string;
}

const { title, subtitle } = Astro.props;
---

<section>
  <h1>{title}</h1>
  {subtitle && <p>{subtitle}</p>}
</section>
```

### 4. Use in a Page

```astro
---
// src/pages/[locale]/index.astro
import Hero from '@/components/capsulo/hero/Hero.astro';
import { loadPageData, getComponentDataByKey } from '@/lib/cms-loader';

const pageData = await loadPageData('index');

// Single instance
const heroData = getComponentDataByKey(pageData, 'hero', locale, 0);

// Multiple instances
const heroes = getAllComponentsByKey(pageData, 'hero', locale);
---

<Layout>
  <!-- Single instance -->
  <Hero {...heroData} />
  
  <!-- Multiple instances -->
  {heroes?.map((data, i) => <Hero key={i} {...data} />)}
</Layout>
```

## Automatic Detection

Once you've created a component following this structure:

1. **Import it** in a `.astro` page file: `import Hero from '@/components/capsulo/hero/Hero.astro'`
2. **Use it** in the template: `<Hero {...heroData} />`
3. **Refresh** the admin page (`/admin`)
4. The component will **automatically appear** in the CMS for content editing!

## Multi-Instance Support

If you use the same component multiple times in a page, the CMS will automatically detect all instances:

```astro
---
import Hero from '@/components/capsulo/hero/Hero.astro';
---

<Layout>
  <Hero {...hero1Data} />  <!-- Detected as hero-0 -->
  <Hero {...hero2Data} />  <!-- Detected as hero-1 -->
  <Hero {...hero3Data} />  <!-- Detected as hero-2 -->
</Layout>
```

In the CMS admin, you'll see:
- Hero #1
- Hero #2
- Hero #3

Each can be edited independently, and you can give them custom aliases (e.g., "Header Hero", "Footer Hero").

## Schema Key Validation

**Important:** The schema key must exactly match the folder name. If there's a mismatch, you'll see an error:

```
❌ Schema key mismatch: folder name is "hero" but schema key is "main-hero"
```

Fix this by ensuring:
- Folder: `capsulo/hero/`
- Schema file: `hero.schema.tsx`
- Schema key: `'hero'` (in `createSchema()`)

## Component File Extensions

Capsulo supports all Astro-compatible component frameworks:

- `.astro` - Astro components
- `.tsx` / `.jsx` - React components
- `.vue` - Vue components  
- `.svelte` - Svelte components
- `.solid` - Solid components

All will be automatically detected if they follow the folder structure convention!

## Troubleshooting

### Component not appearing in CMS?

1. Check that the component is in `@/components/capsulo/`
2. Verify the schema key matches the folder name
3. Ensure the component is imported and used in a page file
4. Refresh the admin page (`/admin`)

### Multiple instances not working?

Make sure you're using the multi-instance API:

```typescript
// ✅ Correct
const heroes = getAllComponentsByKey(pageData, 'hero', locale);
{heroes?.map((data, i) => <Hero key={i} {...data} />)}

// ❌ Wrong (only gets first instance)
const heroData = getComponentDataByKey(pageData, 'hero', locale);
<Hero {...heroData} />
```

## Learn More

- [CMS Vision Documentation](../../../docs/CMS_VISION.md)
- [CMS Injection Guide](../../../docs/CMS_INJECTION.md)
- [Field Types Reference](../../lib/form-builder/fields/README.md)
