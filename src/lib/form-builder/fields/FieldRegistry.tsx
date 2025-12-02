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

export const getFieldComponent = (type: FieldType): FieldComponent | null => {
  return fieldRegistry[type] || null;
};

export const registerFieldComponent = (type: FieldType, component: FieldComponent): void => {
  fieldRegistry[type] = component;
};

// Initialize FieldRenderer with our getFieldComponent function
setFieldComponentGetter((type: string) => getFieldComponent(type as FieldType));
