import type { Field, Schema, IconTheme } from '../core/types';

interface FieldBuilder {
  build(): Field;
}

export const createSchema = (
  name: string,
  fields: (Field | FieldBuilder)[],
  description?: string,
  key?: string,
  icon?: React.ReactNode,
  iconTheme?: IconTheme
): Schema => {
  const builtFields = fields.map(field =>
    'build' in field ? field.build() : field
  );

  return {
    name,
    description,
    fields: builtFields,
    key,
    icon,
    iconTheme,
  };
};

