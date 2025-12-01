# Capsulo CMS - Form Builder System

## What is This?

Capsulo is a content management system (CMS) built for developers who want to give content creators an easy way to manage website content without touching code. It's built on top of Astro and uses a powerful form builder system that lets you create custom content schemas.

## The Big Picture

### How It Works

1. **Developers create schemas** - Define what fields content creators can fill out
2. **Content creators use the CMS** - Fill out forms through a beautiful UI (react shadcn components)
3. **Data gets saved to Astro Collections** - Structured data ready for your website
4. **Website queries the data** - Use standard Astro content APIs to display content

### Why This Approach?

- **Developer-friendly**: Build schemas using code, not configuration files
- **Content creator-friendly**: Simple forms, no code required
- **Type-safe**: Full TypeScript support throughout
- **Astro-native**: Uses Astro Collections for optimal performance
- **No vendor lock-in**: Your data is just files in your repository

## Creating Schemas (Developer Task)

As a developer, you define what content creators can manage by creating **component schemas**. Think of these as templates for different parts of your website.

### Example: Hero Section Schema

```typescript
// src/lib/form-builder/schemas/hero.schema.tsx
import { Input, Textarea } from '../fields';
import { createSchema } from '../builders/SchemaBuilder';

export const HeroSchema = createSchema(
  'Hero',                    // Schema name (shown in CMS)
  [
    Input('title')
      .label('Hero Title')
      .required()
      .placeholder('Enter the main title'),
    
    Textarea('subtitle')
      .label('Subtitle')
      .rows(3)
      .placeholder('Supporting text'),
    
    Input('ctaButton')
      .label('Call to Action Button')
      .placeholder('Get Started')
  ],
  'Main hero section with title, subtitle, and CTA button',  // Description
  'hero'                     // Unique key for CMS injection
);
```

That's it! No registration needed. The CMS automatically discovers this schema and makes it available.

### Available Field Types

Following **shadcn/ui** naming conventions:

- **Input** - Single line text (text, email, URL, password)
  - `Input('fieldName').type('email')`
- **Textarea** - Multi-line text with character counts
  - `Textarea('fieldName').rows(5).maxLength(500)`
- **Select** - Dropdown selection (single or multiple)
  - `Select('fieldName').options([...]).multiple()`

### Layout Types

Organize fields visually without storing layout metadata:

- **Grid** - Responsive column layouts
  - `Grid({ base: 2, lg: 3 }).gap({ base: 4, lg: 6 }).contains([...])`
- **Tabs** - Tabbed interface for organizing fields
  - `Tabs().tab('General', [...]).tab('Advanced', [...])`

### Field Structure

Each field type is fully **self-contained** in its own folder:
```
fields/
├── Input/
│   ├── input.types.ts      # Type definitions
│   ├── input.builder.ts    # Builder API
│   └── input.field.tsx     # React component
├── Textarea/
├── Select/
└── FieldRegistry.tsx       # Maps types to components
```

**Adding new fields is easy** - just create a new folder and register it! See `src/lib/form-builder/fields/README.md` for details.

## Using the CMS (Content Creator Experience)

### 1. Page Management

Content creators see a simple interface:

- **Page Dropdown** - Shows all available pages (About, Contact, Blog, etc.)
- **Component List** - Shows all components that are already on the page (auto-detected from your code)
- **Edit Components** - Click on any component to edit its content

### 2. Content Editing

Components are automatically discovered from your codebase. When a component is imported in an Astro page, it appears in the CMS:

1. **Form appears** - Fields based on the schema you created
2. **Fill out content** - User-friendly forms with validation
3. **Save changes** - Data gets saved automatically
4. **See results** - Changes appear on the website

### 3. Real Example Workflow

```
1. Developer imports Hero component in index.astro
2. CMS auto-detects the component and shows it in the admin
3. Content creator selects "Home Page"
4. Sees the Hero component in the list
5. Clicks on it and fills out the form:
   - Hero Title: "Welcome to Our Site"
   - Subtitle: "We build amazing things"
   - CTA Button: "Learn More"
6. Clicks "Save"
7. Hero section appears on the home page with the new content
```

## How Data Gets Organized

### Page-Based Structure

Each page gets its own data file in the content directory:

```
src/content/pages/
├── index.json       # Home page components
├── about.json       # About page components  
├── contact.json     # Contact page components
└── blog.json        # Blog page components
```

All pages are **auto-detected** from your `src/pages/` directory - no manual configuration needed!

### Component Data Format

```json
{
  "components": [
    {
      "id": "hero-1234567890",
      "schemaName": "Hero",
      "data": {
        "title": { "type": "input", "value": "Welcome to Our Site" },
        "subtitle": { "type": "textarea", "value": "We build amazing things" },
        "ctaButton": { "type": "input", "value": "Learn More" }
      }
    }
  ]
}
```

### Draft & Publish Workflow

Changes are saved to **user-specific draft branches** on GitHub:

1. **Save Draft** → Commits to `cms-draft-{username}` branch
2. **Publish** → Merges draft branch into `main` and deletes draft
3. **Multi-device** → Same drafts across all your devices (synced via GitHub)

**Benefits:**
- ✅ Work from laptop, phone, or tablet
- ✅ Multiple users can have separate drafts
- ✅ No conflicts between collaborators
- ✅ Full version control through Git

## Using Data in Your Astro Site

### Recommended: Use CMS Loader

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

### Alternative: Query Astro Collections Directly

```astro
---
import { getCollection } from 'astro:content';

// Get all pages
const allPages = await getCollection('pages');

// Get specific page
const indexPage = allPages.find(page => page.id === 'index');
const heroComponent = indexPage.data.components.find(c => 
  c.schemaName === 'Hero'
);
---

<Hero 
  title={heroComponent.data.title.value}
  subtitle={heroComponent.data.subtitle.value}
  ctaButton={heroComponent.data.ctaButton.value}
/>
```

**Recommended**: Use `loadPageData()` and `getComponentDataByKey()` for cleaner code and automatic value extraction.

## Key Benefits

### For Developers

- **Fast setup** - Create schemas in minutes
- **No configuration** - Schemas and pages are auto-discovered
- **Type safety** - Full TypeScript support with manual type definitions
- **Modular fields** - Easy to add/remove field types
- **GitHub-based** - No backend needed, all via GitHub API
- **shadcn/ui** - Follows industry-standard naming conventions

### For Content Creators

- **Visual interface** - Beautiful React-based UI with shadcn/ui
- **Page-based organization** - Auto-detected from your site structure
- **Draft & Publish** - Save drafts, preview, then publish
- **Multi-device** - Work from any device, drafts sync via GitHub
- **Component reuse** - Same schemas across multiple pages
- **Validation** - Helpful error messages and required fields

### For Everyone

- **Version controlled** - All changes tracked in Git branches
- **No database** - Everything is JSON files in your repo
- **Fully static** - Host anywhere (Cloudflare Pages, GitHub Pages, Vercel)
- **No servers** - Pure static site generation
- **Collaborative** - Multiple users with separate draft branches
- **GitHub auth** - Secure with fine-grained tokens
- **Portable** - Your data belongs to you

## Implementation Status

### ✅ Phase 1 - COMPLETE!

**Core System:**
- ✅ Field types: Input, Textarea, Select
- ✅ Layout types: Grid, Tabs
- ✅ Schema creation with builder API
- ✅ Schema auto-discovery (via `import.meta.glob`)
- ✅ Dynamic form rendering with Field Registry
- ✅ Modular field architecture (easy to extend)
- ✅ TypeScript support with manual type definitions
- ✅ Runtime validation with Zod

**CMS Interface:**
- ✅ Complete admin UI at `/admin`
- ✅ Page management with auto-detection
- ✅ Component editing and deleting
- ✅ Auto-discovery of components from codebase
- ✅ Draft & Publish workflow
- ✅ User-based draft branches

**GitHub Integration:**
- ✅ GitHub authentication with fine-grained tokens
- ✅ Branch-based drafts (`cms-draft-{username}`)
- ✅ Automatic branch creation/deletion
- ✅ API caching (30s TTL) to prevent rate limits
- ✅ Multi-device support via GitHub
- ✅ Draft/publish workflow with merge

**Performance:**
- ✅ Request loop prevention
- ✅ Async component handling
- ✅ Loading state management
- ✅ Error boundaries

### 🚀 Phase 2 - Future Enhancements

**Field Types:**
- 🔲 ImageUpload (with Cloudflare Images or similar)
- 🔲 DatePicker
- 🔲 Checkbox & Switch
- 🔲 Number input with min/max
- 🔲 Color picker
- 🔲 Repeater fields (dynamic lists)
- 🔲 Rich text editor

**Layout Types:**
- 🔲 Accordion
- 🔲 Stack (vertical/horizontal)
- 🔲 Columns (flexible layouts)

**CMS Features:**
- 🔲 Drag-and-drop component ordering
- 🔲 Component duplication
- 🔲 Search/filter components
- 🔲 Bulk actions
- 🔲 Preview mode before publishing
- 🔲 Change history viewer

**Collaboration:**
- 🔲 View all users' draft branches
- 🔲 Draft comparison tool
- 🔲 Comment system on drafts
- 🔲 Notifications for published changes

**Developer Experience:**
- 🔲 Schema validation errors in dev mode
- 🔲 Field-level permissions
- 🔲 Conditional field visibility
- 🔲 Custom validation rules
- 🔲 CLI for scaffolding schemas
- 🔲 Hot module reload for schema changes

## Getting Started

### 1. Set Up Configuration

Create your config file:
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
  // ... other settings
};

export default config;
```

See [CONFIG.md](./CONFIG.md) for full configuration options.

### 2. Create Your First Schema

```typescript
// src/lib/form-builder/schemas/yourSchema.schema.tsx
import { Input, Textarea, Select } from '../fields';
import { createSchema } from '../builders/SchemaBuilder';

export const YourSchema = createSchema(
  'Your Component Name',     // Name shown in CMS
  [
    Input('fieldName')
      .label('Field Label')
      .required()
      .placeholder('Placeholder text'),
  ],
  'Optional description',    // Description
  'your-component'           // Unique key for injection
);
```

**Note**: File must be named `*.schema.tsx` or `*.schema.ts` to be auto-discovered.

### 3. Start the Development Server

```bash
npm run dev
```

### 4. Access the CMS

1. Visit `http://localhost:4321/login`
2. Authenticate with your GitHub fine-grained token
3. Go to `http://localhost:4321/admin`
4. Start editing components on your pages!

### 5. Use Data in Your Pages

```astro
---
import Hero from '@/components/Hero.astro';
import { loadPageData, getComponentDataByKey } from '@/lib/cms-loader';

const pageData = await loadPageData('index');
const heroData = getComponentDataByKey(pageData, 'hero');
---

<Hero {...heroData} />
```

For more details, see the [CMS Injection Guide](./CMS_INJECTION.md).

## Architecture Highlights

### Modular Field System
Each field type is completely self-contained with its own types, builder, and component. Adding or removing fields only requires touching 3-4 files!

### GitHub-Based Workflow
No backend server needed. All data storage and collaboration happens through GitHub's API, making the system truly static and hostable anywhere.

### Performance First
- Aggressive caching (30s TTL) prevents API loops
- Request deduplication
- Async operation guards
- Optimal re-render prevention

### Developer-Friendly
- TypeScript throughout
- shadcn/ui naming conventions
- Clear separation of concerns
- Extensive documentation

**The goal**: Make content management so simple that non-technical users can manage complex websites while giving developers the power and flexibility they need. ✨