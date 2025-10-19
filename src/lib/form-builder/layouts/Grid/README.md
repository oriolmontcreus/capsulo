# Grid Layout Field

The Grid field is a layout container that allows you to create responsive grid layouts in your CMS schemas. It follows Tailwind CSS breakpoint conventions.

## Basic Usage

### Simple (Non-Responsive)

```typescript
import { Input, Grid } from '../fields';
import { createSchema } from '../builders/SchemaBuilder';

// Simple 3-column grid on all screens
export const MySchema = createSchema(
    'My Schema',
    [
        Grid(3)
            .contains([
                Input('field1').label('Field 1'),
                Input('field2').label('Field 2'),
                Input('field3').label('Field 3')
            ])
    ]
);
```

### Responsive

```typescript
// Responsive: 1 column on mobile, 2 on small, 3 on medium+
Grid({ base: 1, sm: 2, md: 3 })
    .contains([
        Input('field1').label('Field 1'),
        Input('field2').label('Field 2'),
        Input('field3').label('Field 3')
    ])
```

## API Reference

### `Grid(columns?)`

Creates a new Grid layout container.

**Parameters:**
- `columns` (optional): Number or object defining column counts
  - **Simple**: `Grid(3)` - 3 columns on all screens (applied to base)
  - **Responsive**: `Grid({ base: 1, sm: 2, md: 3, lg: 4 })`
    - `base`: Number of columns on mobile (< 640px)
    - `sm`: Number of columns on small screens (640px+)
    - `md`: Number of columns on medium screens (768px+)
    - `lg`: Number of columns on large screens (1024px+)
    - `xl`: Number of columns on extra large screens (1280px+)

**Default:** `{ base: 1, md: 2, lg: 3 }`

### Methods

#### `.label(label: string)`

Sets a label for the grid section.

```typescript
Grid({ lg: 3 })
    .label('Contact Information')
    .contains([...])
```

#### `.description(description: string)`

Sets a description for the grid section.

```typescript
Grid({ lg: 3 })
    .description('Enter your contact details below')
    .contains([...])
```

#### `.gap(size: number | ResponsiveValue)`

Sets the gap between grid items using Tailwind spacing scale (0-96).

**Default:** `{ base: 4 }` (1rem / 16px)

**Simple (same gap on all screens):**
```typescript
Grid({ lg: 3 })
    .gap(6)  // 1.5rem / 24px on all screens (applied to base)
    .contains([...])
```

**Responsive (different gaps per breakpoint):**
```typescript
Grid({ base: 1, sm: 2, md: 3 })
    .gap({ base: 2, sm: 4, lg: 6 })  // Larger gaps on larger screens
    .contains([...])
```

#### `.contains(fields: Field[])`

Defines the fields to be displayed in the grid.

```typescript
Grid({ lg: 3 })
    .contains([
        Input('name').label('Name'),
        Input('email').label('Email'),
        Input('phone').label('Phone')
    ])
```

## Examples

### Simple Grid (Non-Responsive)

```typescript
// Fixed 4 columns on all screen sizes
Grid(4)
    .gap(4)
    .contains([
        Input('q1').label('Q1 Sales'),
        Input('q2').label('Q2 Sales'),
        Input('q3').label('Q3 Sales'),
        Input('q4').label('Q4 Sales')
    ])
```

### Responsive Grid with Fixed Gap

```typescript
Grid({ lg: 3, md: 2, sm: 1 })
    .label('Product Features')
    .gap(6)  // Same gap on all screens
    .contains([
        Input('feature1').label('Feature 1'),
        Input('feature2').label('Feature 2'),
        Input('feature3').label('Feature 3'),
        Input('feature4').label('Feature 4'),
        Input('feature5').label('Feature 5'),
        Input('feature6').label('Feature 6')
    ])
```

**Result:**
- Large screens (1024px+): 3 columns, gap-6
- Medium screens (768px+): 2 columns, gap-6
- Small screens (640px+): 1 column, gap-6

### Responsive Grid with Responsive Gaps

```typescript
// Tighter gaps on smaller screens
Grid({ lg: 3, md: 2, sm: 1 })
    .label('Contact Information')
    .gap({ lg: 8, md: 6, sm: 4 })
    .contains([
        Input('email').label('Email'),
        Input('phone').label('Phone'),
        Input('address').label('Address')
    ])
```

**Result:**
- Large screens: 3 columns, 2rem gap
- Medium screens: 2 columns, 1.5rem gap
- Small screens: 1 column, 1rem gap

### Two-column layout

```typescript
Grid({ md: 2, sm: 1 })
    .contains([
        Input('firstName').label('First Name'),
        Input('lastName').label('Last Name')
    ])
```

### Four-column grid

```typescript
Grid({ xl: 4, lg: 3, md: 2, sm: 1 })
    .gap(4)
    .contains([
        Input('q1').label('Q1 Sales'),
        Input('q2').label('Q2 Sales'),
        Input('q3').label('Q3 Sales'),
        Input('q4').label('Q4 Sales')
    ])
```

### Nested grids

```typescript
createSchema('Page', [
    Input('title').label('Page Title'),
    
    Grid({ lg: 2, sm: 1 })
        .label('Main Content')
        .contains([
            Textarea('leftContent').label('Left Column'),
            Textarea('rightContent').label('Right Column')
        ]),
    
    Grid({ lg: 3, md: 2, sm: 1 })
        .label('Features')
        .gap(6)
        .contains([
            Input('feature1').label('Feature 1'),
            Input('feature2').label('Feature 2'),
            Input('feature3').label('Feature 3')
        ])
])
```

## Tailwind CSS Breakpoints

The Grid field uses Tailwind's default breakpoint system:

| Breakpoint | Min Width | Typical Devices |
|------------|-----------|-----------------|
| `sm` | 640px | Large phones (landscape), small tablets |
| `md` | 768px | Tablets, small laptops |
| `lg` | 1024px | Laptops, desktops |
| `xl` | 1280px | Large desktops |

## Data Storage

Grid fields are layout containers and don't store their own data. Instead, they organize how nested fields are displayed. The nested fields store their values normally in the component data **at the same level as other fields**.

**Example data structure:**
```json
{
  "components": [
    {
      "id": "footer-1",
      "schemaName": "Footer",
      "data": {
        "companyName": { "type": "input", "value": "Acme Corp" },
        "description": { "type": "textarea", "value": "A great company" },
        "email": { "type": "input", "value": "contact@acme.com" },
        "phone": { "type": "input", "value": "(555) 123-4567" },
        "address": { "type": "input", "value": "123 Main St" }
      }
    }
  ]
}
```

**Key points:**
- Grid layout itself is not stored in the data
- Nested fields (`email`, `phone`, `address`) are stored at the **component level**, not nested under the grid
- During form rendering, the Grid receives an object with its nested field values
- When Grid fields change, the updates are merged back into the flat component data structure

This flat storage approach:
- ✅ Keeps data structure simple and predictable
- ✅ Makes validation easier (each field validates independently)
- ✅ Allows fields to be moved between layouts without data migration
- ✅ Compatible with Astro content collections

## Future Enhancements

The Grid field is designed to be extensible. Future layout containers could include:

- `Tabs()` - Tabbed interface for grouped content
- `Accordion()` - Collapsible sections
- `Stack()` - Vertical stacking with spacing
- `Columns()` - Fixed column layouts with specific widths
- `Section()` - Grouped fields with borders/background

These can be added following the same pattern as Grid!
