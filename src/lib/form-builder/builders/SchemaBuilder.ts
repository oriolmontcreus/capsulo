import type { Field, Schema } from '../core/types';

interface FieldBuilder {
  build(): Field;
}

export const createSchema = (name: string, fields: (Field | FieldBuilder)[], description?: string): Schema => {
  const builtFields = fields.map(field => 
    'build' in field ? field.build() : field
  );

  return {
    name,
    description,
    fields: builtFields,
  };
};

