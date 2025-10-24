# Form Validation Implementation

## Overview
Form validation has been implemented in the CMS to ensure data quality. The validation is **lazy** - it only runs when the user attempts to save, not on every keystroke. This optimizes performance while still catching errors.

## How It Works

### 1. Validation Trigger
- Validation **only runs when the Save button is clicked**
- No live validation while typing (better performance)
- Errors are shown after attempting to save with invalid data

### 2. Validation Flow
```
User clicks Save
    ↓
CMSManager.handleSaveAllComponents()
    ↓
Validates all components using Zod schemas
    ↓
If errors found:
  - Show error messages inline on fields
  - Display alert banner at top
  - Prevent save
    ↓
If no errors:
  - Save data
  - Clear any previous errors
```

### 3. Components Updated

#### **CMSManager** (`src/components/admin/CMSManager.tsx`)
- Added `validationErrors` state: `Record<componentId, Record<fieldName, errorMessage>>`
- Validates all components in `handleSaveAllComponents()` before saving
- Passes validation errors down to each `InlineComponentForm`
- Shows alert banner when validation errors exist

#### **InlineComponentForm** (`src/components/admin/InlineComponentForm.tsx`)
- Receives `validationErrors` prop from parent
- Passes errors to individual field components
- No live validation - just displays errors when provided

#### **DynamicForm** (`src/components/admin/DynamicForm.tsx`)
- Validates on form submit (when adding new components)
- Shows errors inline after submit attempt
- Prevents save until errors are fixed

### 4. Field Validation Rules

**Input Fields:**
- Email validation for `type="email"`
- URL validation for `type="url"`
- Required field validation
- Custom validation messages

**Textarea Fields:**
- maxLength validation
- Required field validation

**Select Fields:**
- Option validation (must be from defined options)
- Required field validation

## Example Usage

```tsx
// In a schema:
Input('email')
  .label('Contact email')
  .type('email')  // Validates email format
  .required()     // Makes field required
  .placeholder('contact@example.com')
```

When user enters invalid data and clicks save:
1. Error appears below the field: "Invalid email"
2. Red alert banner appears at top
3. Save is prevented
4. Field shows visual error state

## Performance Benefits

**Before (live validation):**
- Validated on every keystroke
- Multiple Zod schema checks per second
- Could impact performance with many fields

**After (lazy validation):**
- Only validates when user clicks save
- Single validation pass per save attempt
- Much better performance, especially with complex schemas

## User Experience

1. User fills out form fields
2. No validation errors shown while typing (clean experience)
3. User clicks "Save"
4. If errors exist:
   - Errors appear inline on invalid fields
   - Alert banner explains there are validation errors
   - User fixes errors
   - Clicks save again
5. If no errors:
   - Data saves successfully
   - Any previous errors are cleared

## Technical Details

### Validation Logic
```typescript
// Validate all components before save
const errors: Record<string, Record<string, string>> = {};
let hasAnyErrors = false;

pageData.components.forEach(component => {
  const schema = availableSchemas.find(s => s.name === component.schemaName);
  const formData = componentFormData[component.id] || {};
  const componentErrors: Record<string, string> = {};

  schema.fields.forEach(field => {
    const zodSchema = fieldToZod(field);
    const value = formData[field.name] ?? component.data[field.name]?.value;
    const result = zodSchema.safeParse(value);

    if (!result.success) {
      const errorMessage = result.error.errors[0]?.message || 'Invalid value';
      componentErrors[field.name] = errorMessage;
      hasAnyErrors = true;
    }
  });

  if (Object.keys(componentErrors).length > 0) {
    errors[component.id] = componentErrors;
  }
});

// Show errors and prevent save
if (hasAnyErrors) {
  setValidationErrors(errors);
  alert('Please fix the validation errors before saving.');
  return;
}
```

### Error Display
```tsx
// In InlineComponentForm
<FieldComponent
  key={field.name}
  field={field}
  value={formData[field.name]}
  onChange={(value) => handleChange(field.name, value)}
  error={validationErrors?.[field.name]}  // Pass error from parent
/>
```

## Future Enhancements

Potential improvements:
- Optional live validation toggle in settings
- Custom error messages per field
- Cross-field validation (e.g., "end date must be after start date")
- Async validation (e.g., check if email already exists)
- Warning-level validations (non-blocking)
