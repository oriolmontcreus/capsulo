import React from 'react';
import type { Field, FieldType } from '../core/types';
import { TextInputField } from './TextInput/textinput.field';
import { TextareaField } from './Textarea/textarea.field';
import { RichEditorField } from './RichEditor/richeditor.field';
import { SelectField } from './Select/select.field';

type FieldComponent = React.FC<{
  field: Field;
  value: any;
  onChange: (value: any) => void;
}>;

const fieldRegistry: Record<FieldType, FieldComponent> = {
  textInput: TextInputField as FieldComponent,
  textarea: TextareaField as FieldComponent,
  richEditor: RichEditorField as FieldComponent,
  select: SelectField as FieldComponent,
};

export const getFieldComponent = (type: FieldType): FieldComponent | null => fieldRegistry[type] || null;

export const registerFieldComponent = (type: FieldType, component: FieldComponent): void => {
  fieldRegistry[type] = component;
};

