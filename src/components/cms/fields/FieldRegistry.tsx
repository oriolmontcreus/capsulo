import React from 'react';
import type { Field, FieldType } from '@/lib/form-builder';
import { TextInputField } from './TextInputField';
import { TextareaField } from './TextareaField';
import { RichEditorField } from './RichEditorField';
import { SelectField } from './SelectField';

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

