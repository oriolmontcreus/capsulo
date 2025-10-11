# Capsulo CMS - Phase 1 Complete! 🎉

A fully static, GitHub Pages-compatible CMS built with Astro and React.

## ✨ What's Implemented

### Phase 1 Features

- ✅ **Field Builder System** - TextInput, Textarea, RichEditor (basic), Select
- ✅ **Schema Creation** - Easy fluent API for defining component schemas
- ✅ **Schema Auto-Discovery** - No registration needed, just create schemas
- ✅ **Dynamic Form Rendering** - Automatic form generation from schemas
- ✅ **Astro Collections Integration** - Uses native Astro content collections
- ✅ **Static-First Architecture** - No API routes, fully static for GitHub Pages
- ✅ **Local Storage + Export** - Edit locally, export to commit
- ✅ **Example Hero Schema** - Ready-to-use hero section component

## 🚀 Quick Start

### 1. Access the CMS

Visit the CMS admin panel:
```
http://localhost:4321/admin
```

### 2. Create Content

1. Select a page from the dropdown (Home, About, Contact, Blog)
2. Click "+ Hero Section" to add a component
3. Fill out the form fields
4. Click "Save Component"

### 3. Export Your Changes

1. Click "Export JSON" button
2. A file like `home.json` will download
3. Save it to `src/content/pages/` in your project
4. Commit the file to Git

### 4. Rebuild & Deploy

```bash
npm run build
```

Your changes are now permanent and will deploy with your site!

## 📁 Project Structure

```
src/
├── lib/
│   └── form-builder/
│       ├── fields/          # Field builders (TextInput, Textarea, etc.)
│       ├── core/            # Core types and registry
│       ├── builders/        # Schema builder
│       └── schemas/         # Your component schemas
│           └── Hero.ts      # Example: Hero section schema
├── content/
│   ├── config.ts           # Collection definitions
│   └── pages/              # Page data files (JSON)
│       ├── home.json
│       ├── about.json
│       ├── contact.json
│       └── blog.json
├── components/
│   └── cms/                # CMS UI components
│       ├── CMSManager.tsx
│       ├── DynamicForm.tsx
│       └── ComponentCard.tsx
└── pages/
    ├── admin.astro         # CMS admin interface
    └── demo.astro          # Example usage

```

## 🎨 Creating Schemas

Create a new schema in `src/lib/form-builder/schemas/`:

```typescript
// src/lib/form-builder/schemas/ContactForm.ts
import { TextInput, Textarea } from '../fields';
import { createSchema } from '../builders/SchemaBuilder';

export const ContactFormSchema = createSchema(
  'Contact Form',
  [
    TextInput('heading')
      .label('Form Heading')
      .required()
      .placeholder('Get in Touch'),
    
    TextInput('email')
      .label('Contact Email')
      .inputType('email')
      .required(),
    
    Textarea('message')
      .label('Default Message')
      .rows(4)
      .placeholder('We\'d love to hear from you!')
  ],
  'Contact form component with heading and email'
);
```

Then register it in `src/lib/form-builder/schemas/index.ts`:

```typescript
import { registerSchema } from '../core/schemaRegistry';
import { HeroSchema } from './Hero';
import { ContactFormSchema } from './ContactForm';

registerSchema(HeroSchema);
registerSchema(ContactFormSchema);

export const schemas = {
  Hero: HeroSchema,
  ContactForm: ContactFormSchema,
};
```

## 🔧 Using Content in Your Site

Query the content in any Astro page:

```astro
---
import { getEntry } from 'astro:content';
import { Hero } from '@/components/Hero';

// Get page data
const homeData = await getEntry('pages', 'home');

// Find a specific component
const heroComponent = homeData?.data?.components?.find(
  c => c.schemaName === 'Hero Section'
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

## 📚 Available Field Types

### TextInput
```typescript
TextInput('fieldName')
  .label('Display Label')
  .placeholder('Placeholder text')
  .required()
  .inputType('text' | 'email' | 'url' | 'password')
  .defaultValue('Default')
```

### Textarea
```typescript
Textarea('fieldName')
  .label('Display Label')
  .placeholder('Placeholder text')
  .required()
  .rows(5)
  .maxLength(500)
  .defaultValue('Default')
```

### RichEditor
```typescript
RichEditor('fieldName')
  .label('Display Label')
  .placeholder('Placeholder text')
  .required()
  .defaultValue('Default')
```
*Note: Phase 1 uses plain textarea. Formatting tools coming in Phase 2!*

### Select
```typescript
Select('fieldName')
  .label('Display Label')
  .placeholder('Choose one...')
  .required()
  .options([
    { label: 'Option 1', value: 'opt1' },
    { label: 'Option 2', value: 'opt2' }
  ])
  .multiple()
```

## 🎯 How It Works

### Architecture

1. **Content Collections** - Astro's native content system stores JSON files
2. **CMS Interface** - React app for editing (runs in browser)
3. **localStorage** - Temporary storage for your edits
4. **Export** - Download JSON files to commit to your repo
5. **Static Build** - Everything becomes static HTML

### Why This Approach?

✅ **Fully Static** - No server, no database, no vendor lock-in
✅ **Git-Based** - All content versioned with your code
✅ **GitHub Pages Ready** - Deploy anywhere static sites are hosted
✅ **Developer Friendly** - Code schemas, not config files
✅ **Content Creator Friendly** - Simple forms, no code needed

## 🔄 Workflow

```
1. Developer creates schema → 2. CMS auto-discovers it
                                ↓
3. Content creator edits → 4. Export JSON → 5. Commit to Git
                                               ↓
                                         6. Rebuild & Deploy
```

## 🎬 Demo Page

Visit `/demo` to see an example of querying and displaying CMS data:
```
http://localhost:4321/demo
```

## 🚧 Coming in Phase 2

- [ ] Advanced field types (ImageUpload, DatePicker)
- [ ] Rich text editor with formatting toolbar
- [ ] Auto-detection of Astro pages
- [ ] Reordering components (drag & drop)
- [ ] Component duplication
- [ ] Global settings/variables
- [ ] Preview mode

## 🐛 Troubleshooting

### TypeScript errors in .astro files
The content collection types are generated at runtime. The `as any` assertions are intentional workarounds. Once the dev server runs, types are generated properly.

### Changes don't appear on the site
Remember: you need to export the JSON and save it to `src/content/pages/` then rebuild. The CMS uses localStorage which is temporary.

### Lost my changes
Check localStorage in browser dev tools under `capsulo-cms-*` keys. You can manually copy the data if needed.

## 📝 Notes

- The CMS runs entirely in the browser
- Changes are saved to localStorage until exported
- The asterisk (*) next to page names indicates local changes
- Export JSON files must be manually placed in `src/content/pages/`
- Rebuild the site to see exported changes

---

**Built with Astro, React, TypeScript, and Tailwind CSS**

