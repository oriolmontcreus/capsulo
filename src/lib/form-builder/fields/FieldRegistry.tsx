import React from 'react';
import type { Field, FieldType } from '../core/types';
import { InputField } from './Input/input.field';
import { TextareaField } from './Textarea/textarea.field';
import { SelectField } from './Select/select.field';
import { SwitchField } from './Switch/switch.field';
import { RichEditorField } from './RichEditor/richeditor.field';
import { FileUploadField } from './FileUpload/fileUpload.field';
import { ColorPickerField } from './ColorPicker/colorpicker.field';
import { DateFieldComponent } from './DateField/datefield.field';
import { GridFieldComponent } from '../layouts/Grid/grid.layout';
import { TabsFieldComponent } from '../layouts/Tabs/tabs.layout';
import { RepeaterField } from './Repeater/repeater.field';
import { setFieldComponentGetter } from '../core/FieldRenderer';

interface ComponentData {
  id: string;
  schemaName: string;
  data: Record<string, { type: any; value: any }>;
}

type FieldComponent = React.FC<{
  field: Field;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  fieldErrors?: Record<string, string>;
  componentData?: ComponentData;
  formData?: Record<string, any>;
  highlightedField?: string;
  locale?: string;
}>;

const fieldRegistry: Record<FieldType, FieldComponent> = {
  input: InputField as FieldComponent,
  textarea: TextareaField as FieldComponent,
  select: SelectField as FieldComponent,
  switch: SwitchField as FieldComponent,
  richeditor: RichEditorField as FieldComponent,
  fileUpload: FileUploadField as FieldComponent,
  colorpicker: ColorPickerField as FieldComponent,
  datefield: DateFieldComponent as FieldComponent,
  grid: GridFieldComponent as FieldComponent,
  tabs: TabsFieldComponent as FieldComponent,
  repeater: RepeaterField as FieldComponent,
};

/**
 * Type alias map for field type normalization.
 */
const FIELD_TYPE_ALIASES: Record<string, FieldType> = {
  // Input field aliases
  'text': 'input',
  'email': 'input',
  'password': 'input',
  'url': 'input',
  'number': 'input',
  // Date field aliases
  'date': 'datefield',
  // Rich editor aliases
  'rich-text': 'richeditor',
  // File upload aliases
  'file': 'fileUpload',
  'image': 'fileUpload',
  // Color picker aliases
  'color': 'colorpicker',
};

// Re-export for backward compatibility (the actual definition is in field-ts-types.ts)
export { FIELD_TS_TYPES } from './field-ts-types';

/**
 * Normalizes a field type string to its canonical FieldType.
 * Use this to convert aliases like 'text', 'email', 'date' to their proper registry keys.
 * @param type - The field type string (may be an alias)
 * @returns The canonical FieldType, or the original type if no alias found
 */
export const normalizeFieldType = (type: string): FieldType => {
  return FIELD_TYPE_ALIASES[type] || (type as FieldType);
};

export const getFieldComponent = (type: FieldType): FieldComponent | null => {
  const normalizedType = normalizeFieldType(type);
  return fieldRegistry[normalizedType] || null;
};

export const registerFieldComponent = (type: FieldType, component: FieldComponent): void => {
  fieldRegistry[type] = component;
};

// Initialize FieldRenderer with our getFieldComponent function
setFieldComponentGetter((type: string) => getFieldComponent(type as FieldType));
