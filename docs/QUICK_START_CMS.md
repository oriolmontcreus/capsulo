# Quick Start: CMS Data Injection

Learn how to use CMS data in your components in 3 simple steps!

## Step 1: Add a Key to Your Schema

```typescript
export const HeroSchema = createSchema(
  'Hero',
  [ /* your fields */ ],
  'Hero section',
  'hero'  // ← Add this unique key
);
```

## Step 2: Load Data in Your Page

```astro
---
import Hero from '@/components/Hero.astro';
import { loadPageData, getComponentDataByKey } from '@/lib/cms-loader';

const pageData = await loadPageData('index');
const heroData = getComponentDataByKey(pageData, 'hero');
---

<Hero {...heroData} />
```

## Step 3: Manage Content in CMS

1. Go to `/admin`
2. Add/edit components
3. Save and publish
4. Your content appears automatically! 🎉

---

📚 For detailed documentation, see [CMS_INJECTION.md](./CMS_INJECTION.md)
