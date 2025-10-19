# Architecture: Fields vs Layouts

## Core Principles

### Fields (Data Fields)
**Purpose**: Collect and store user input
**Location**: `src/lib/form-builder/fields/`
**Examples**: Input, Textarea, Select, Checkbox, etc.
**Stored**: YES - Values are saved to JSON collections

### Layouts (Visual Containers)
**Purpose**: Organize fields visually in the CMS
**Location**: `src/lib/form-builder/layouts/`
**Examples**: Grid, Tabs, Accordion, Stack, etc.
**Stored**: NO - Only used for CMS UI, not saved to JSON

## Why Layouts Aren't Saved

**Benefits of not storing layouts:**
1. **Simpler Data Structure** - JSON files only contain actual data, not UI metadata
2. **Schema Evolution** - You can change layouts without migrating existing data
3. **Flexibility** - Same data can be displayed in different layouts
4. **Performance** - Smaller JSON files, faster loading
5. **Portability** - Data can be used outside the CMS without layout dependencies

## Type System

```typescript
// Data fields - store actual values
export type DataField =
  | InputField
  | TextareaField  
  | SelectField;

// Layouts - organize fields visually
export type Layout =
  | GridField
  | TabsField  // Future
  | AccordionField;  // Future

// Union of all for schema building
export type Field = DataField | Layout;

// Component data only stores data fields
export interface ComponentData {
  data: Record<string, { 
    type: DataFieldType;  // Only 'input' | 'textarea' | 'select'
    value: any;
  }>;
}
```

## Data Flow

### Schema Definition (Developer)
```typescript
export const FooterSchema = createSchema('Footer', [
  Input('companyName').label('Company'),
  
  Grid({ lg: 3, md: 2, sm: 1 })  // Layout - not saved
    .contains([
      Input('email'),    // ✓ Saved
      Input('phone'),    // ✓ Saved  
      Input('address')   // ✓ Saved
    ])
]);
```

### Saved JSON (Collection)
```json
{
  "components": [{
    "schemaName": "Footer",
    "data": {
      "companyName": { "type": "input", "value": "Acme Corp" },
      "email": { "type": "input", "value": "contact@acme.com" },
      "phone": { "type": "input", "value": "555-1234" },
      "address": { "type": "input", "value": "123 Main St" }
    }
  }]
}
```

**Note**: Grid layout is NOT in the JSON - it's defined in the schema only.

## Field Flattening

The `flattenFields()` helper extracts data fields from nested layouts:

```typescript
import { flattenFields } from '@/lib/form-builder/core/fieldHelpers';

const schema = {
  fields: [
    Input('name'),
    Grid([
      Input('email'),
      Input('phone')
    ])
  ]
};

const dataFields = flattenFields(schema.fields);
// Returns: [Input('name'), Input('email'), Input('phone')]
// Grid is removed, nested fields are flattened
```

This is used when:
- **Saving**: Only data fields are stored
- **Validating**: Only data fields are validated
- **Querying**: Only data fields appear in collections

## Performance: Registry Pattern

Instead of switch/case statements (O(n)), we use a registry pattern (O(1)):

```typescript
// ❌ BAD - O(n) lookup
switch (field.type) {
  case 'input': return <InputField />;
  case 'textarea': return <TextareaField />;
  case 'select': return <SelectField />;
  // ... 30 more cases
}

// ✅ GOOD - O(1) lookup
const fieldRegistry = {
  input: InputField,
  textarea: TextareaField,
  select: SelectField,
  // ... 30 more entries
};

const FieldComponent = fieldRegistry[field.type];  // Instant lookup
```

## Circular Dependency Solution

**Problem**: Grid needs to render fields, but FieldRegistry needs to register Grid.

**Solution**: Late binding pattern

```typescript
// FieldRenderer.tsx - doesn't import FieldRegistry
let getFieldComponentFn = null;

export const setFieldComponentGetter = (fn) => {
  getFieldComponentFn = fn;
};

export const FieldRenderer = ({ field }) => {
  const Component = getFieldComponentFn(field.type);
  return <Component />;
};

// FieldRegistry.tsx - initializes FieldRenderer
import { setFieldComponentGetter } from '../core/FieldRenderer';

setFieldComponentGetter(getFieldComponent);  // Initialize on load
```

**Flow**:
1. Grid imports FieldRenderer (no circular dep yet)
2. FieldRegistry imports Grid (no circular dep yet)
3. FieldRegistry calls `setFieldComponentGetter()` to connect them
4. Now FieldRenderer can lookup components via FieldRegistry

## Adding New Layouts

1. **Create layout files** in `layouts/YourLayout/`
2. **Register** in `FieldRegistry.tsx`
3. **Use** in schemas without modifying data structure

```typescript
// 1. Create layout
export const Tabs = (tabs: string[]) => new TabsBuilder(tabs);

// 2. Register
const fieldRegistry = {
  // ... existing fields
  tabs: TabsFieldComponent
};

// 3. Use in schema
Tabs(['General', 'Advanced']).contains({
  'General': [Input('name')],
  'Advanced': [Input('apiKey')]
});

// Data saved: { name: "...", apiKey: "..." }
// Tabs structure: NOT saved, only in schema
```

## Summary

✅ **Data Fields** → Saved to JSON  
✅ **Layouts** → Only in schema, not saved  
✅ **Registry Pattern** → O(1) performance  
✅ **Field Flattening** → Extract only data fields  
✅ **Late Binding** → No circular dependencies  

This architecture keeps data simple while allowing sophisticated CMS UIs! 🎨
