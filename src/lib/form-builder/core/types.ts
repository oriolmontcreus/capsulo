// Data field types (store actual values)
export type DataField =
  | import('../fields/Input/input.types').InputField
  | import('../fields/Textarea/textarea.types').TextareaField
  | import('../fields/Select/select.types').SelectField;

// Layout types (organize fields visually, don't store data)
export type Layout =
  | import('../layouts/Grid/grid.types').GridField;

// Union of all field and layout types for schema building
export type Field = DataField | Layout;

export type FieldType = Field['type'];
export type DataFieldType = DataField['type'];

// Schema types
export interface Schema {
  name: string;
  description?: string;
  fields: Field[];
  key?: string; // Unique key to identify the schema for CMS injection
}

// Component data types - only stores data fields, not layouts
export interface ComponentData {
  id: string;
  schemaName: string;
  data: Record<string, { type: DataFieldType; value: any }>;
}

export interface PageData {
  components: ComponentData[];
}
