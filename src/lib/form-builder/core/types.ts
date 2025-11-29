// Data field types (store actual values)
export type DataField =
  | import('../fields/Input/input.types').InputField
  | import('../fields/Textarea/textarea.types').TextareaField
  | import('../fields/Select/select.types').SelectField
  | import('../fields/Switch/switch.types').SwitchField
  | import('../fields/RichEditor/richeditor.types').RichEditorField
  | import('../fields/FileUpload/fileUpload.types').FileUploadField
  | import('../fields/ColorPicker/colorpicker.types').ColorPickerField
  | import('../fields/DateField/datefield.types').DateField;

// Layout types (organize fields visually, don't store data)
export type Layout =
  | import('../layouts/Grid/grid.types').GridLayout
  | import('../layouts/Tabs/tabs.types').TabsLayout;

// Union of all field and layout types for schema building
export type Field = DataField | Layout;

export type FieldType = Field['type'];
export type DataFieldType = DataField['type'];

// Icon theme options for schema presentation
export type IconTheme = 'gray' | 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'pink' | 'indigo' | 'orange';

// Schema types
export interface Schema {
  name: string;
  description?: string;
  fields: Field[];
  key?: string; // Unique key to identify the schema for CMS injection
  icon?: React.ReactNode; // Optional icon/prefix slot for UI presentation
  iconTheme?: IconTheme; // Optional theme color for icon background
}

/**
 * Component data types - only stores data fields, not layouts
 * 
 * ID Format: Uses deterministic format `${schemaKey}-${index}` (e.g., "hero-0", "hero-1", "footer-0")
 * This allows multiple instances of the same component to be distinguished and ensures
 * consistent IDs across page refreshes and builds.
 * 
 * @property id - Deterministic identifier in format `${schemaKey}-${index}`
 * @property schemaName - Name of the schema this component uses
 * @property alias - Optional user-defined custom name for the component instance
 * @property data - Field values stored as objects with type, translatable flag, and value
 */
export interface ComponentData {
  id: string;
  schemaName: string;
  alias?: string;
  data: Record<string, { type: DataFieldType; translatable?: boolean; value: any }>;
}

// Re-export translation types for convenience
export type {
  TranslatableField,
  FieldValue,
  TranslationMetadata,
  ComponentData as TranslationComponentData,
  I18nConfig,
  TranslationStatus,
  TranslationContextValue,
  TranslationState,
  FieldContext
} from './translation.types';

export interface PageData {
  components: ComponentData[];
}
