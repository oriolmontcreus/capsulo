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
export const Hero = {
  name: 'Hero Section',
  fields: [
    TextInput('title')
      .label('Hero Title')
      .required()
      .placeholder('Enter the main title'),
    
    Textarea('subtitle')
      .label('Subtitle')
      .rows(3)
      .placeholder('Supporting text'),
    
    TextInput('ctaButton')
      .label('Call to Action Button')
      .placeholder('Get Started')
  ]
}
```

That's it! No registration needed. The CMS automatically discovers this schema and makes it available.

### Available Field Types

- **TextInput** - Single line text (email, URL, password, etc.)
- **Textarea** - Multi-line text with character counts
- **Select** - Single select or multie select component

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

Each page gets its own data file:

```
src/content/
├── pages-home.json        # Home page components
├── pages-about.json       # About page components  
├── pages-contact.json     # Contact page components
└── globals.json           # Site-wide settings
```

### Component Data Format

```json
{
  "components": [
    {
      "id": "hero-1",
      "schemaName": "Hero",
      "data": {
        "title": { "type": "textInput", "value": "Welcome" },
        "subtitle": { "type": "textarea", "value": "We build..." }
      }
    }
  ]
}
```

## Using Data in Your Astro Site

### Query Page Components

```astro
---
import { getEntry } from 'astro:content';

// Get all components for the home page
const homeData = await getEntry('pages', 'home');
const heroComponent = homeData.components.find(c => c.schemaName === 'Hero');
---

<Hero 
  title={heroComponent.data.title.value}
  subtitle={heroComponent.data.subtitle.value}
/>
```

### Global Variables

```astro
---
import { getEntry } from 'astro:content';

const globals = await getEntry('globals', 'site');
const siteName = globals.data.siteName.value;
---

<title>{siteName}</title>
```

## Key Benefits

### For Developers

- **Fast setup** - Create schemas in minutes
- **No configuration** - Schemas are auto-discovered
- **Type safety** - Full TypeScript support
- **Flexible** - Easy to add new field types
- **Astro-native** - Works seamlessly with Astro

### For Content Creators

- **Visual interface** - No code required
- **Page-based organization** - Easy to understand structure  
- **Component reuse** - Same schemas across multiple pages
- **Real-time preview** - See changes immediately
- **Validation** - Helpful error messages and guidance

### For Everyone

- **Version controlled** - All changes tracked in Git
- **No database** - Everything is files
- **Fast builds** - Astro's optimized collection system
- **Portable** - Your data belongs to you

## Future Vision

### Phase 1
-  Basic field types (TextInput, Textarea, RichEditor)
-  Schema creation and discovery
-  Dynamic form rendering

### Phase 2 
-  Complete CMS interface with page management
-  Additional field types (ImageUpload, Select, DatePicker)
-  Auto-detection of Astro pages

## Getting Started

1. **Create your first schema** in `src/lib/form-builder/schemas/`
2. **Start the CMS** and visit `/admin` (coming soon)
3. **Add components to pages** using the visual interface
4. **Query data in your Astro pages** using the content API

The goal is to make content management so simple that non-technical users can manage complex websites while giving developers the power and flexibility they need.