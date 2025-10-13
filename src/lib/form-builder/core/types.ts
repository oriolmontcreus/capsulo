// Union types for all fields
export type Field =
  | import('../fields/Input/input.types').InputField
  | import('../fields/Textarea/textarea.types').TextareaField
  | import('../fields/Select/select.types').SelectField;

export type FieldType = Field['type'];

// Schema types
export interface Schema {
  name: string;
  description?: string;
  fields: Field[];
  key?: string; // Unique key to identify the schema for CMS injection
}

// Component data types
export interface ComponentData {
  id: string;
  schemaName: string;
  data: Record<string, { type: FieldType; value: any }>;
}

export interface PageData {
  components: ComponentData[];
}
