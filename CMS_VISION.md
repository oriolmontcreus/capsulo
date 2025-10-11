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
// src/lib/form-builder/schemas/Hero.ts
import { Input, Textarea } from '../fields';
import { createSchema } from '../builders/SchemaBuilder';

export const HeroSchema = createSchema(
  'Hero Section',
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
  'Main hero section with title, subtitle, and CTA button'
);
```

That's it! No registration needed. The CMS automatically discovers this schema and makes it available.

### Available Field Types

Following **shadcn/ui** naming conventions:

- **Input** - Single line text (text, email, URL, password)
  - `Input('fieldName').inputType('email')`
- **Textarea** - Multi-line text with character counts
  - `Textarea('fieldName').rows(5).maxLength(500)`
- **Select** - Dropdown selection (single or multiple)
  - `Select('fieldName').options([...]).multiple()`

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
- **Component Library** - Shows all available schemas (Hero, Footer, ContactForm)
- **Add Components** - Click "+" to add a schema to a page

### 2. Content Editing

When you add a component to a page:

1. **Form appears** - Fields based on the schema you created
2. **Fill out content** - User-friendly forms with validation
3. **Save changes** - Data gets saved automatically
4. **See results** - Changes appear on the website

### 3. Real Example Workflow

```
1. Content creator selects "Home Page"
2. Clicks "Add Component" → selects "Hero Section" 
3. Fills out the form:
   - Hero Title: "Welcome to Our Site"
   - Subtitle: "We build amazing things"
   - CTA Button: "Learn More"
4. Clicks "Save"
5. Hero section appears on the home page
```

## How Data Gets Organized

### Page-Based Structure

Each page gets its own data file in Astro Collections:

```
src/content/pages/
├── home.json        # Home page components
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
      "id": "hero-section-1234567890",
      "schemaName": "Hero Section",
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

### Query Page Components

```astro
---
import { getCollection } from 'astro:content';

// Get all pages
const allPages = await getCollection('pages');

// Get specific page
const homePage = allPages.find(page => page.id === 'home');
const heroComponent = homePage.data.components.find(c => 
  c.schemaName === 'Hero Section'
);
---

<Hero 
  title={heroComponent.data.title.value}
  subtitle={heroComponent.data.subtitle.value}
  ctaButton={heroComponent.data.ctaButton.value}
/>
```

### Rendering Components Dynamically

```astro
---
const homePage = allPages.find(page => page.id === 'home');
---

{homePage.data.components.map(component => {
  switch (component.schemaName) {
    case 'Hero Section':
      return <Hero {...extractValues(component.data)} />;
    case 'Footer':
      return <Footer {...extractValues(component.data)} />;
    default:
      return null;
  }
})}
```

## Key Benefits

### For Developers

- **Fast setup** - Create schemas in minutes
- **No configuration** - Schemas and pages are auto-discovered
- **Type safety** - Full TypeScript support
- **Modular fields** - Easy to add/remove field types (4 steps!)
- **Astro-native** - Works seamlessly with Astro Collections
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
- ✅ Schema creation with builder API
- ✅ Schema auto-discovery
- ✅ Dynamic form rendering with Field Registry
- ✅ Modular field architecture (easy to extend)

**CMS Interface:**
- ✅ Complete admin UI at `/admin`
- ✅ Page management with auto-detection
- ✅ Component adding/editing/deleting
- ✅ Draft & Publish workflow
- ✅ User-based draft branches

**GitHub Integration:**
- ✅ GitHub authentication with fine-grained tokens
- ✅ Branch-based drafts (cms-draft-{username})
- ✅ Automatic branch creation/deletion
- ✅ API caching (30s TTL) to prevent loops
- ✅ Multi-device support via GitHub

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
- 🔲 Slider & Number inputs
- 🔲 Color picker
- 🔲 Repeater fields (dynamic lists)

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
- 🔲 Schema validation
- 🔲 Field-level permissions
- 🔲 Conditional field visibility
- 🔲 Custom validation rules
- 🔲 CLI for scaffolding schemas

## Getting Started

### 1. Set Up Environment

Create a `.env` file:
```env
GITHUB_REPO_OWNER=your-github-username
GITHUB_REPO_NAME=your-repo-name
```

### 2. Create Your First Schema

```typescript
// src/lib/form-builder/schemas/YourSchema.ts
import { Input, Textarea, Select } from '../fields';
import { createSchema } from '../builders/SchemaBuilder';

export const YourSchema = createSchema(
  'Your Component Name',
  [
    Input('fieldName')
      .label('Field Label')
      .required()
      .placeholder('Placeholder text'),
  ],
  'Optional description'
);
```

### 3. Start the Development Server

```bash
npm run dev
```

### 4. Access the CMS

1. Visit `http://localhost:4321/login`
2. Authenticate with your GitHub fine-grained token
3. Go to `http://localhost:4321/admin`
4. Start adding components to pages!

### 5. Use Data in Your Pages

```astro
---
import { getCollection } from 'astro:content';

const pages = await getCollection('pages');
const homePage = pages.find(p => p.id === 'home');
---

{homePage.data.components.map(component => (
  <!-- Render your components here -->
))}
```

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