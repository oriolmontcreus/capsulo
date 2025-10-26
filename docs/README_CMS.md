# Capsulo CMS - Complete! 🎉

A GitHub-native CMS built with Astro and React, featuring dual storage modes for development and production.

## ✨ What's Implemented

### Core Features

- ✅ **Field Types** - Input, Textarea, Select (single/multiple)
- ✅ **Layout Types** - Grid (responsive), Tabs (with variants)
- ✅ **Schema Creation** - Fluent API with builder pattern
- ✅ **Schema Auto-Discovery** - Automatic registration via `import.meta.glob`
- ✅ **Dynamic Form Rendering** - Field Registry with O(1) lookup
- ✅ **Type Safety** - `SchemaProps<T>` for automatic type inference
- ✅ **Runtime Validation** - Zod validation with `getSchemaProps()`
- ✅ **Dual Storage Modes** - Local files (dev) + GitHub API (production)
- ✅ **Draft/Publish Workflow** - User-specific draft branches
- ✅ **GitHub Authentication** - Fine-grained tokens with caching
- ✅ **Page Auto-Detection** - Discovers pages from `src/pages/`
- ✅ **TypeScript Config** - Type-safe configuration with IntelliSense

## ⚙️ Configuration

Capsulo CMS uses a TypeScript configuration file for easy, type-safe setup.

### Quick Setup

1. Copy the example config:
```bash
cp capsulo.config.example.ts capsulo.config.ts
```

2. Edit `capsulo.config.ts` with your settings:
```typescript
const config: CapsuloConfig = {
  github: {
    owner: "your-github-username",
    repo: "your-repo-name",
  },
  app: {
    authWorkerUrl: "https://your-auth-worker.workers.dev",
  },
  // ... more options
};

export default config;
```

📖 **For complete configuration options, see [CONFIG.md](./CONFIG.md)**

## 🚀 Quick Start

### 1. Configure GitHub (Production Only)

For production use, set up your GitHub repository:

```bash
cp capsulo.config.example.ts capsulo.config.ts
```

Edit `capsulo.config.ts`:
```typescript
const config: CapsuloConfig = {
  github: {
    owner: "your-github-username",
    repo: "your-repo-name",
  },
  // ... more options
};

export default config;
```

📖 **See [CONFIG.md](./CONFIG.md) for all options**

### 2. Access the CMS

**Development Mode** (`npm run dev`):
```
http://localhost:4321/admin
```
No authentication needed - changes save to local files instantly.

**Production Mode** (deployed site):
```
https://yoursite.com/admin
```
Requires GitHub authentication with fine-grained token.

### 3. Create Content

1. Select a page from the dropdown (auto-detected from `src/pages/`)
2. Click "Add Component" to add a schema instance
3. Fill out the form fields
4. Click "Save changes"

### 4. Development vs Production

**Development Mode:**
- Changes write directly to `src/content/pages/*.json`
- Instant hot reload (no publish step)
- No GitHub authentication required

**Production Mode:**
- Changes save to draft branch (`cms-draft-[username]`)
- Click "Publish" to merge to main
- GitHub Actions rebuilds and deploys

## 📁 Project Structure

```
src/
├── lib/
│   ├── form-builder/
│   │   ├── fields/              # Field types (Input, Textarea, Select)
│   │   │   ├── Input/
│   │   │   ├── Textarea/
│   │   │   ├── Select/
│   │   │   └── FieldRegistry.tsx
│   │   ├── layouts/             # Layout types (Grid, Tabs)
│   │   │   ├── Grid/
│   │   │   └── Tabs/
│   │   ├── core/                # Core types, helpers, registry
│   │   │   ├── types.ts
│   │   │   ├── fieldHelpers.ts
│   │   │   ├── FieldRenderer.tsx
│   │   │   ├── schemaRegistry.ts
│   │   │   └── schemaToZod.ts
│   │   ├── builders/            # Schema builder
│   │   │   └── SchemaBuilder.ts
│   │   └── schemas/             # Your component schemas
│   │       ├── index.ts         # Auto-discovery
│   │       ├── hero.schema.tsx
│   │       └── footer.schema.tsx
│   ├── cms-loader.ts            # Load CMS data in pages
│   ├── cms-storage-adapter.ts   # Unified storage interface
│   ├── cms-storage-local.ts     # Dev mode storage
│   ├── cms-storage.ts           # Production GitHub storage
│   ├── github-api.ts            # GitHub API wrapper
│   └── schema-props.ts          # Type inference helpers
├── content/
│   ├── config.ts                # Astro content collection config
│   └── pages/                   # Page data files (JSON)
│       ├── index.json
│       └── about.json
├── components/
│   ├── admin/                   # CMS UI components
│   │   ├── CMSManager.tsx
│   │   ├── DynamicForm.tsx
│   │   ├── SaveButton.tsx
│   │   ├── PublishButton.tsx
│   │   └── ...
│   └── Hero.astro               # Example component
├── pages/
│   ├── index.astro              # Homepage
│   ├── admin/
│   │   ├── index.astro          # CMS admin interface
│   │   └── login.astro          # GitHub auth (production)
│   └── api/
│       └── cms/
│           ├── save.ts          # Dev mode save endpoint
│           └── load.ts          # Dev mode load endpoint
└── capsulo.config.ts            # CMS configuration
```

## 🎨 Creating Schemas

Create a new schema in `src/lib/form-builder/schemas/`:

```typescript
// src/lib/form-builder/schemas/contact.schema.tsx
import { Input, Textarea } from '../fields';
import { Grid } from '../layouts';
import { createSchema } from '../builders/SchemaBuilder';

export const ContactSchema = createSchema(
  'Contact Form',                    // Schema name (shown in CMS)
  [
    Input('heading')
      .label('Form Heading')
      .required()
      .placeholder('Get in Touch'),
    
    Grid({ base: 1, md: 2 })         // Responsive grid layout
      .gap(4)
      .contains([
        Input('email')
          .label('Contact Email')
          .type('email')
          .required(),
        
        Input('phone')
          .label('Phone Number')
          .placeholder('(555) 123-4567')
      ]),
    
    Textarea('message')
      .label('Default Message')
      .rows(4)
      .placeholder('We\'d love to hear from you!')
  ],
  'Contact form component with heading and email',  // Description
  'contact-form'                     // Unique key for CMS injection
);
```

**That's it!** The schema is automatically discovered and registered. No manual registration needed.

### File Naming Convention

- File must match pattern: `*.schema.ts` or `*.schema.tsx`
- Examples: `hero.schema.tsx`, `footer.schema.tsx`, `contact.schema.tsx`

## 🔧 Using Content in Your Site

### Recommended Approach (CMS Loader)

```astro
---
import Hero from '@/components/Hero.astro';
import { loadPageData, getComponentDataByKey } from '@/lib/cms-loader';

// Load CMS data for this page
const pageData = await loadPageData('index');

// Get component data by schema key
const heroData = getComponentDataByKey(pageData, 'hero');
---

<Hero {...heroData} />
```

### Creating Type-Safe Components

```astro
---
// src/components/Hero.astro
import { getSchemaProps } from '@/lib/schema-props';
import { HeroSchema } from '@/lib/form-builder/schemas/hero.schema';
import type { SchemaProps } from '@/lib/schema-props';

// Automatically infer types from schema
export type Props = SchemaProps<typeof HeroSchema>;

// Validate props with Zod
const props = getSchemaProps(HeroSchema, Astro.props);

// Destructure with defaults
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

### Alternative: Direct Astro Collections

```astro
---
import { getCollection } from 'astro:content';
import Hero from '@/components/Hero.astro';

// Get all pages
const allPages = await getCollection('pages');

// Get specific page
const indexPage = allPages.find(page => page.id === 'index');

// Find component by schema name
const heroComponent = indexPage?.data.components.find(
  c => c.schemaName === 'Hero'
);
---

{heroComponent && (
  <Hero 
    title={heroComponent.data.title.value}
    subtitle={heroComponent.data.subtitle.value}
    ctaButton={heroComponent.data.ctaButton.value}
  />
)}
```

📖 **For complete details, see [CMS_INJECTION.md](./CMS_INJECTION.md)**

## 📚 Available Field Types

### Input
```typescript
Input('fieldName')
  .label('Display Label')
  .description('Helper text shown below field')
  .placeholder('Placeholder text')
  .required()
  .type('text' | 'email' | 'url' | 'password' | 'tel')
  .defaultValue('Default')
  .prefix(<Icon />)              // Optional icon/component
```

### Textarea
```typescript
Textarea('fieldName')
  .label('Display Label')
  .description('Helper text')
  .placeholder('Placeholder text')
  .required()
  .rows(5)
  .maxLength(500)
  .defaultValue('Default')
```

### Select
```typescript
Select('fieldName')
  .label('Display Label')
  .description('Helper text')
  .placeholder('Choose one...')
  .required()
  .options([
    { label: 'Option 1', value: 'opt1' },
    { label: 'Option 2', value: 'opt2' }
  ])
  .multiple()                    // Allow multiple selections
  .defaultValue('opt1')
```

## 📐 Available Layout Types

### Grid
```typescript
Grid({ base: 1, md: 2, lg: 3 })  // Responsive columns
  .gap({ base: 4, lg: 6 })        // Responsive gap
  .contains([
    Input('field1'),
    Input('field2'),
    Input('field3')
  ])
```

### Tabs
```typescript
Tabs()
  .variant('default' | 'vertical')
  .className('custom-classes')
  .tab('General', [
    Input('name'),
    Input('email')
  ])
  .tab('Advanced', [
    Input('apiKey')
  ], { prefix: <Icon /> })        // Optional icon
```

## 🎯 How It Works

### Architecture

1. **Dual Storage** - Local files (dev) or GitHub API (production)
2. **Schema Auto-Discovery** - Via `import.meta.glob` pattern
3. **CMS Interface** - React app with shadcn/ui components
4. **Type Safety** - `SchemaProps<T>` for automatic type inference
5. **Runtime Validation** - Zod schemas generated from field definitions
6. **Draft Branches** - User-specific branches for production edits

### Why This Approach?

✅ **Developer-Friendly** - Fast iteration with local files in dev mode
✅ **Git-Based** - All content versioned with your code
✅ **Type-Safe** - Full TypeScript support with automatic inference
✅ **Production-Ready** - GitHub API with draft/publish workflow
✅ **No Vendor Lock-In** - Your data is just JSON files in your repo
✅ **Multi-User** - Separate draft branches per user
✅ **Flexible Hosting** - Deploy anywhere (Cloudflare Pages, Vercel, etc.)

## 🔄 Workflow

### Development Mode
```
1. Create schema → 2. Auto-discovered by CMS
                        ↓
3. Edit in /admin → 4. Save (writes to local JSON)
                        ↓
5. Hot reload → 6. See changes instantly
                        ↓
7. Commit JSON files to Git when ready
```

### Production Mode
```
1. Create schema → 2. Auto-discovered by CMS
                        ↓
3. Edit in /admin → 4. Authenticate with GitHub
                        ↓
5. Save (commits to draft branch: cms-draft-[username])
                        ↓
6. Preview changes → 7. Click "Publish"
                        ↓
8. Merges to main → 9. GitHub Actions rebuilds site
```

## 🐛 Troubleshooting

### Development Mode Issues

**Changes don't appear:**
1. Check browser console for API errors
2. Verify dev server is running
3. Check file permissions in `src/content/pages/`
4. Try hard refresh (Ctrl+Shift+R)

**TypeScript errors:**
1. Ensure schema file matches `*.schema.{ts,tsx}` pattern
2. Check that field types are imported correctly
3. Verify `SchemaProps<typeof YourSchema>` syntax

### Production Mode Issues

**Can't authenticate:**
1. Verify GitHub token is valid and not expired
2. Check token has Contents: Read & Write permissions
3. Ensure `capsulo.config.ts` has correct owner/repo

**Can't save changes:**
1. Check browser console for GitHub API errors
2. Verify repository allows branch creation
3. Check GitHub API rate limits
4. Ensure network connectivity

**Publish fails:**
1. Verify draft branch exists
2. Check for merge conflicts
3. Ensure GitHub Actions are enabled
4. Review repository branch protection rules

## 📖 Documentation

- **[CMS_VISION.md](./CMS_VISION.md)** - Overview and introduction
- **[CMS_INJECTION.md](./CMS_INJECTION.md)** - Complete guide to using CMS data
- **[ARCHITECTURE_FIELDS_VS_LAYOUTS.md](./ARCHITECTURE_FIELDS_VS_LAYOUTS.md)** - Field vs Layout architecture
- **[DEV_VS_PROD_MODES.md](./DEV_VS_PROD_MODES.md)** - Dual storage mode details
- **[SCHEMA_PROPS_GUIDE.md](./SCHEMA_PROPS_GUIDE.md)** - Type inference guide

## � Future Enhancements

### Field Types
- [ ] ImageUpload (with Cloudflare Images integration)
- [ ] DatePicker with calendar UI
- [ ] Checkbox & Switch components
- [ ] Number input with min/max validation
- [ ] Color picker
- [ ] Rich text editor with formatting toolbar
- [ ] Repeater fields (dynamic lists)

### Layout Types
- [ ] Accordion for collapsible sections
- [ ] Stack (vertical/horizontal spacing)
- [ ] Columns (flexible multi-column layouts)

### CMS Features
- [ ] Drag-and-drop component reordering
- [ ] Component duplication
- [ ] Search/filter components
- [ ] Bulk actions
- [ ] Preview mode before publishing
- [ ] Change history viewer
- [ ] Draft comparison tool

### Collaboration
- [ ] View all users' draft branches
- [ ] Comment system on drafts
- [ ] Notifications for published changes
- [ ] Real-time collaboration indicators

### Developer Experience
- [ ] Schema validation errors in dev mode
- [ ] Field-level permissions
- [ ] Conditional field visibility
- [ ] Custom validation rules
- [ ] CLI for scaffolding schemas
- [ ] Hot module reload for schema changes

---

**Built with Astro, React, TypeScript, Tailwind CSS, and shadcn/ui**

