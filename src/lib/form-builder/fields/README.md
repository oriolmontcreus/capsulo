# Form Builder Fields

Each field type has its own folder containing everything needed for that field.

## Structure

```
fields/
├── TextInput/
│   ├── textinput.builder.ts   # Builder class with fluent API
│   └── textinput.field.tsx     # React component for rendering
├── Textarea/
│   ├── textarea.builder.ts
│   └── textarea.field.tsx
├── RichEditor/
│   ├── richeditor.builder.ts
│   └── richeditor.field.tsx
├── Select/
│   ├── select.builder.ts
│   └── select.field.tsx
├── FieldRegistry.tsx           # Maps field types to components
└── index.ts                    # Exports all builders and components
```

## Creating a New Field Type

### Step 1: Create the Folder

```bash
mkdir src/lib/form-builder/fields/YourField
```

### Step 2: Create the Builder (`yourfield.builder.ts`)

```typescript
import type { YourFieldType } from '../../core/types';

class YourFieldBuilder {
  private field: YourFieldType;

  constructor(name: string) {
    this.field = {
      type: 'yourField',
      name,
      // ... default properties
    };
  }

  // Fluent API methods
  label(value: string): this {
    this.field.label = value;
    return this;
  }

  // Add more methods for your field's properties
  customProperty(value: any): this {
    this.field.customProperty = value;
    return this;
  }

  build(): YourFieldType {
    return this.field;
  }
}

export const YourField = (name: string): YourFieldBuilder => new YourFieldBuilder(name);
```

### Step 3: Create the Component (`yourfield.field.tsx`)

```typescript
import React from 'react';
import type { YourFieldType } from '../../core/types';
import { Label } from '@/components/ui/label';

interface YourFieldProps {
  field: YourFieldType;
  value: any;
  onChange: (value: any) => void;
}

export const YourFieldComponent: React.FC<YourFieldProps> = ({ field, value, onChange }) => (
  <div className="space-y-2">
    <Label htmlFor={field.name}>
      {field.label || field.name}
      {field.required && <span className="text-red-500 ml-1">*</span>}
    </Label>
    {/* Your custom input component here */}
    <input
      id={field.name}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      // ... other props
    />
  </div>
);
```

### Step 4: Add Type Definition

In `src/lib/form-builder/core/types.ts`:

```typescript
export interface YourFieldType extends BaseField {
  type: 'yourField';
  customProperty?: any;
  // ... other properties
}

// Update the Field union type
export type Field = TextInputField | TextareaField | ... | YourFieldType;

// Update FieldType
export type FieldType = 'textInput' | 'textarea' | ... | 'yourField';
```

### Step 5: Register in FieldRegistry

In `src/lib/form-builder/fields/FieldRegistry.tsx`:

```typescript
import { YourFieldComponent } from './YourField/yourfield.field';

const fieldRegistry: Record<FieldType, FieldComponent> = {
  // ... existing fields
  yourField: YourFieldComponent as FieldComponent,
};
```

### Step 6: Export in index.ts

In `src/lib/form-builder/fields/index.ts`:

```typescript
export { YourField } from './YourField/yourfield.builder';
export { YourFieldComponent } from './YourField/yourfield.field';
```

## Using Fields in Schemas

```typescript
import { TextInput, Textarea, YourField } from '@/lib/form-builder/fields';
import { createSchema } from '../builders/SchemaBuilder';

export const MySchema = createSchema(
  'My Component',
  [
    TextInput('title')
      .label('Title')
      .required(),
    
    Textarea('description')
      .label('Description')
      .rows(5),
    
    YourField('customField')
      .label('Custom Field')
      .customProperty('value'),
  ]
);
```

## Benefits of This Structure

✅ **Beginner-Friendly**: Everything for a field is in one place  
✅ **Easy to Add**: Just copy a folder and modify  
✅ **Self-Contained**: Each field is independent  
✅ **Clear Separation**: Builder (props) vs Component (UI) are in separate files  
✅ **No Confusion**: No need to search across multiple directories

