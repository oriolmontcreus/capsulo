# Form Builder Fields

A modular, self-contained field system following shadcn/ui naming conventions. Each field is completely independent with its own types, builder, and component.

## 🎯 Design Principles

1. **Co-located Types**: Each field defines its own types in its folder
2. **shadcn/ui Naming**: Follow industry-standard naming (Input, Textarea, Select)
3. **Easy Addition/Removal**: Add or remove fields by just adding/deleting a folder
4. **Self-Contained**: Each field has everything it needs in one place

## 📁 Structure

```
fields/
├── Input/
│   ├── input.types.ts      # InputField type definition
│   ├── input.builder.ts    # Input() builder for schema creation
│   └── input.field.tsx     # InputField React component
├── Textarea/
│   ├── textarea.types.ts
│   ├── textarea.builder.ts
│   └── textarea.field.tsx
├── Select/
│   ├── select.types.ts
│   ├── select.builder.ts
│   └── select.field.tsx
├── FieldRegistry.tsx       # Maps field types to components
└── index.ts               # Exports all fields
```

## ✅ Adding a New Field (Example: Switch)

### 1. Create the folder structure
```
fields/
└── Switch/
    ├── switch.types.ts
    ├── switch.builder.ts
    └── switch.field.tsx
```

### 2. Define types (`switch.types.ts`)
```typescript
export interface SwitchField {
  type: 'switch';
  name: string;
  label?: string;
  required?: boolean;
  defaultValue?: boolean;
  description?: string;
}
```

### 3. Create builder (`switch.builder.ts`)
```typescript
import type { SwitchField } from './switch.types';

class SwitchBuilder {
  private field: SwitchField;

  constructor(name: string) {
    this.field = { type: 'switch', name };
  }

  label(value: string): this {
    this.field.label = value;
    return this;
  }

  description(value: string): this {
    this.field.description = value;
    return this;
  }

  build(): SwitchField {
    return this.field;
  }
}

export const Switch = (name: string): SwitchBuilder => new SwitchBuilder(name);
```

### 4. Create component (`switch.field.tsx`)
```tsx
import React from 'react';
import type { SwitchField } from './switch.types';
import { Switch as SwitchUI } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface SwitchFieldProps {
  field: SwitchField;
  value: any;
  onChange: (value: any) => void;
}

export const SwitchField: React.FC<SwitchFieldProps> = ({ field, value, onChange }) => (
  <div className="flex items-center space-x-2">
    <SwitchUI
      id={field.name}
      checked={value || false}
      onCheckedChange={onChange}
    />
    <Label htmlFor={field.name}>{field.label || field.name}</Label>
  </div>
);
```

### 5. Register in `FieldRegistry.tsx`
```typescript
import { SwitchField } from './Switch/switch.field';

const fieldRegistry: Record<FieldType, FieldComponent> = {
  input: InputField as FieldComponent,
  textarea: TextareaField as FieldComponent,
  select: SelectField as FieldComponent,
  switch: SwitchField as FieldComponent, // ← Add here
};
```

### 6. Export in `fields/index.ts`
```typescript
export { Switch } from './Switch/switch.builder';
export { SwitchField } from './Switch/switch.field';
export type { SwitchField as SwitchFieldType } from './Switch/switch.types';
```

### 7. Update union type in `core/types.ts`
```typescript
export type Field = 
  | import('../fields/Input/input.types').InputField
  | import('../fields/Textarea/textarea.types').TextareaField
  | import('../fields/Select/select.types').SelectField
  | import('../fields/Switch/switch.types').SwitchField; // ← Add here
```

**That's it!** 7 steps, most of which are creating new files in one folder.

## ❌ Removing a Field (Example: RichEditor)

### Steps to Remove:
1. Delete `src/lib/form-builder/fields/RichEditor/` folder
2. Remove from `FieldRegistry.tsx` (import and registry entry)
3. Remove exports from `fields/index.ts`
4. Remove from union type in `core/types.ts`

**Only 4 steps, mostly just deletions!**

Compare this to the old system which required touching 7+ files scattered across the codebase.

## 🎨 Usage in Schemas

```typescript
import { Input, Textarea, Select } from '../fields';
import { createSchema } from '../builders/SchemaBuilder';

export const ContactSchema = createSchema(
  'Contact Form',
  [
    Input('name')
      .label('Full Name')
      .required()
      .placeholder('John Doe'),
    
    Input('email')
      .label('Email Address')
      .inputType('email')
      .required(),
    
    Textarea('message')
      .label('Message')
      .rows(5)
      .maxLength(500)
      .placeholder('Your message here...'),
    
    Select('topic')
      .label('Topic')
      .required()
      .options([
        { label: 'General Inquiry', value: 'general' },
        { label: 'Support', value: 'support' },
        { label: 'Sales', value: 'sales' }
      ])
  ]
);
```

## 🔧 Available Fields

### Input
Text input following shadcn/ui patterns
- Types: `text`, `email`, `url`, `password`
- Builder: `Input(name)`

### Textarea
Multi-line text input
- Builder: `Textarea(name)`
- Methods: `.rows()`, `.maxLength()`

### Select
Dropdown selection
- Builder: `Select(name)`
- Methods: `.options()`, `.multiple()`

## 📝 Field Properties

All fields support:
- `.label(string)` - Display label
- `.placeholder(string)` - Placeholder text
- `.required(boolean)` - Mark as required
- `.defaultValue(any)` - Set default value
