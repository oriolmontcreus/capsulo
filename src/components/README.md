# Component Structure

This directory follows a **co-located component architecture** where each component lives in its own directory alongside its schema and related files.

## Structure

```
src/components/
├── hero/
│   ├── Hero.astro          # Component implementation
│   └── hero.schema.tsx     # CMS schema definition
├── footer/
│   └── footer.schema.tsx   # CMS schema definition
└── ...
```

## Benefits

1. **Easy to find**: Everything related to a component is in one place
2. **CLI-friendly**: Scaffolding new components is straightforward
3. **Self-contained**: Each component is a complete module
4. **Clear ownership**: No confusion about which schema belongs to which component

## Adding a New Component

### Manual Creation

1. Create a new directory: `src/components/my-component/`
2. Create the component: `MyComponent.astro`
3. Create the schema: `my-component.schema.tsx`

That's it! The schema will be auto-discovered and the component can be imported directly.

## Schema Discovery

Schemas are automatically discovered from:
- **Component directories**: `src/components/**/*.schema.{ts,tsx}`
- **Showcase examples**: `src/lib/form-builder/schemas/*.schema.{ts,tsx}`

No manual registration needed!

## Future: CLI Tool

A CLI tool may be added in the future to help scaffold new components:

```bash
# Coming soon
capsulo scaffold component my-component
```

This would automatically:
- Create the directory structure
- Generate boilerplate component file
- Create schema template
