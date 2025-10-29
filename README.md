# Capsulo CMS

A type-safe, GitHub-native content management system built with Astro and React.

## What is Capsulo?

Capsulo is a modern CMS that lets developers define content schemas in code while giving content creators a beautiful, user-friendly interface to manage website content. It features dual storage modes: local files for rapid development and GitHub API for production collaboration.

## Key Features

✨ **Developer-Friendly**
- Define schemas using easy React/TSX components with an special Fluent API
- Automatic schema discovery (no registration needed)
- Full TypeScript support - define your own component prop types
- Runtime validation with Zod

🎨 **Content Creator-Friendly**
- Beautiful shadcn/ui components
- No code required - just fill out forms
- Draft & publish workflow
- Multi-device support via GitHub

🚀 **Production-Ready**
- Dual storage: local files (dev) + GitHub API (production)
- User-specific draft branches
- GitHub Actions integration
- Deploy anywhere (Cloudflare Pages, Vercel, Netlify, etc.)

## Quick Start

### Installation

```bash
npm install
```

### Development Mode

```bash
npm run dev
```

Visit `http://localhost:4321/admin` to access the CMS. Changes save directly to local files with instant hot reload.

### Production Setup

1. Edit `capsulo.config.ts` with your GitHub details:
```typescript
const config: CapsuloConfig = {
  github: {
    owner: "your-username",
    repo: "your-repo"
  }
}
```

2. Deploy and authenticate with a GitHub fine-grained token

## Creating Your First Schema

```typescript
// src/lib/form-builder/schemas/hero.schema.tsx
import { Input, Textarea } from '../fields';
import { Grid } from '../layouts';
import { createSchema } from '../builders/SchemaBuilder';

export const HeroSchema = createSchema(
  'Hero',
  [
    Input('title')
      .label('Hero Title')
      .required()
      .defaultValue('Welcome'),
    
    Grid({ base: 1, md: 2 })
      .contains([
        Input('ctaButton').label('CTA Button'),
        Input('ctaLink').label('CTA Link')
      ])
  ],
  'Hero section with title and CTA',
  'hero'  // Unique key for CMS injection
);
```

That's it! The schema is auto-discovered and appears in the CMS.

## Using CMS Data

```astro
---
import Hero from '@/components/Hero.astro';
import { loadPageData, getComponentDataByKey } from '@/lib/cms-loader';

const pageData = await loadPageData('index');
const heroData = getComponentDataByKey(pageData, 'hero');
---

<Hero {...heroData} />
```

## Available Fields & Layouts

**Fields** (store data):
- `Input` - Text, email, URL, password, number
- `Textarea` - Multi-line text with character limits
- `Select` - Single or multiple selection dropdowns

**Layouts** (organize fields):
- `Grid` - Responsive column layouts
- `Tabs` - Tabbed interface for field organization

## Documentation

📚 **Complete Guides:**
- **[CMS Vision](./docs/CMS_VISION.md)** - Overview and introduction
- **[CMS Injection Guide](./docs/CMS_INJECTION.md)** - Using CMS data in components
- **[README CMS](./docs/README_CMS.md)** - Complete CMS documentation
- **[Schema Props Guide](./docs/SCHEMA_PROPS_GUIDE.md)** - Type inference and validation

📖 **Architecture:**
- **[Fields vs Layouts](./docs/ARCHITECTURE_FIELDS_VS_LAYOUTS.md)** - Core architecture explained
- **[Dev vs Prod Modes](./docs/DEV_VS_PROD_MODES.md)** - Dual storage system details
- **[Validation](./docs/VALIDATION_IMPLEMENTATION.md)** - Form validation with Zod

## Tech Stack

- **[Astro](https://astro.build)** - Static site framework
- **[React](https://react.dev)** - CMS UI components
- **[TypeScript](https://www.typescriptlang.org)** - Type safety
- **[Tailwind CSS](https://tailwindcss.com)** - Styling
- **[shadcn/ui](https://ui.shadcn.com)** - UI components
- **[Zod](https://zod.dev)** - Schema validation

## Project Structure

```
src/
├── lib/form-builder/      # Schema system
│   ├── fields/            # Input, Textarea, Select
│   ├── layouts/           # Grid, Tabs
│   ├── schemas/           # Your component schemas
│   └── core/              # Type system & validation
├── components/
│   ├── admin/             # CMS UI components
│   └── *.astro            # Your site components
├── pages/
│   ├── admin/             # CMS interface
│   └── *.astro            # Your site pages
└── content/pages/         # CMS data (JSON)
```

## License

MIT

---

**Built with ❤️ using Astro, React, TypeScript, and shadcn/ui**
