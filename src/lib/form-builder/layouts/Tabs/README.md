# Tabs Layout

A simple and flexible layout wrapper for organizing fields into tabbed sections in your CMS forms.

## Basic Usage

```typescript
import { Tabs } from '../layouts';
import { Input, Textarea } from '../fields';

Tabs()
  .tab('Basic', [
    Input('name').label('Name'),
    Input('email').label('Email')
  ])
  .tab('Advanced', [
    Input('apiKey').label('API Key')
  ])
```

## With Icons/Badges

You can add any React element next to the tab label using the optional third parameter:

```typescript
import { Tabs } from '../layouts';
import { Badge } from '@/components/ui/badge';

Tabs()
  .tab('Basic', [...fields])
  .tab('Pro Features', [...fields], <Badge variant="secondary">Pro</Badge>)
  .tab('Settings', [...fields], <Icon name="settings" />)
```

## Complete Example

```typescript
import { Input, Textarea, Select } from '../fields';
import { Tabs, Grid } from '../layouts';
import { createSchema } from '../builders/SchemaBuilder';

export const UserProfileSchema = createSchema(
  'User Profile',
  [
    Tabs()
      .tab('Personal Info', [
        Input('firstName').label('First Name').required(),
        Input('lastName').label('Last Name').required(),
        Input('email').label('Email').type('email').required(),
        Input('phone').label('Phone Number')
      ])
      .tab('Address', [
        Input('street').label('Street Address'),
        Grid(2).contains([
          Input('city').label('City'),
          Input('zipCode').label('ZIP Code')
        ]),
        Select('country').label('Country').options([...])
      ])
      .tab('Preferences', [
        Select('theme').label('Theme').options([
          { label: 'Light', value: 'light' },
          { label: 'Dark', value: 'dark' }
        ]),
        Textarea('bio').label('Bio').rows(5)
      ])
  ]
);
```

## Nesting Layouts

Tabs work seamlessly with other layouts like Grid:

```typescript
Tabs()
  .tab('Contact Details', [
    Grid({ lg: 2, sm: 1 }).contains([
      Input('email').label('Email'),
      Input('phone').label('Phone'),
      Input('website').label('Website'),
      Input('linkedin').label('LinkedIn')
    ])
  ])
  .tab('Social Media', [
    Grid(2).contains([
      Input('twitter').label('Twitter'),
      Input('facebook').label('Facebook')
    ])
  ])
```

## API Reference

### `Tabs()`
Creates a new tabs layout builder.

### `.tab(label, fields, icon?)`
Adds a tab to the layout.

**Parameters:**
- `label: string` - The text displayed on the tab trigger
- `fields: (Field | FieldBuilder)[]` - Array of fields to render in this tab
- `icon?: ReactNode` - Optional React element (icon, badge, image, etc.) shown next to the label

**Returns:** `this` (for chaining)

### `.build()`
Builds the final TabsField configuration (called automatically by the schema builder).

## Styling

The component uses shadcn/ui's Tabs component with these features:

- **Responsive grid layout** - Tabs automatically distribute evenly across available width
- **Icon support** - Icons are displayed inline with proper spacing
- **Accessible** - Full keyboard navigation and ARIA support
- **Themeable** - Inherits your shadcn/ui theme

## How It Works

1. **Tab triggers** are rendered in a grid layout at the top
2. **Tab content** shows/hides based on selection
3. **Field values** are stored in a flat object (same as Grid layout)
4. **First tab** is selected by default

## Field Value Structure

```typescript
// Given this schema:
Tabs()
  .tab('Basic', [Input('name')])
  .tab('Advanced', [Input('apiKey')])

// The value object looks like:
{
  name: { type: 'input', value: 'John Doe' },
  apiKey: { type: 'input', value: 'sk_...' }
}
```

Values are stored flat regardless of which tab they're in - the tabs are purely for UI organization.

## Tips

✅ **Use tabs for logical grouping** - Group related fields together  
✅ **Keep tab count reasonable** - 3-5 tabs is ideal, more can be overwhelming  
✅ **Short, clear labels** - "Basic Info" not "Basic Information Settings"  
✅ **Consider mobile** - Tabs work well on small screens  
✅ **Nest with Grid** - Combine layouts for powerful forms  

❌ **Don't overuse** - Simple forms don't need tabs  
❌ **Don't hide required fields** - Users might miss them  
❌ **Don't make labels too long** - They need to fit on mobile  

## Implementation Notes

- Built using shadcn/ui's `<Tabs>` component
- Fully accessible with keyboard navigation
- Integrates seamlessly with FieldRenderer
- No additional dependencies beyond existing UI components
- Values stored the same way as Grid (flat structure)
