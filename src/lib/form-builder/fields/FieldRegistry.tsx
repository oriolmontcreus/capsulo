import React from 'react';
import type { Field, FieldType } from '../core/types';
import { InputField } from './Input/input.field';
import { TextareaField } from './Textarea/textarea.field';
import { SelectField } from './Select/select.field';

type FieldComponent = React.FC<{
  field: Field;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}>;

const fieldRegistry: Record<FieldType, FieldComponent> = {
  input: InputField as FieldComponent,
  textarea: TextareaField as FieldComponent,
  select: SelectField as FieldComponent,
};

export const getFieldComponent = (type: FieldType): FieldComponent | null => fieldRegistry[type] || null;

export const registerFieldComponent = (type: FieldType, component: FieldComponent): void => {
  fieldRegistry[type] = component;
};
