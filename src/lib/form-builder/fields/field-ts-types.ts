/**
 * Field TypeScript Type Mappings
 * 
 * Maps field builder names to their TypeScript output types.
 * Used by the schema type generator (scripts/lib/schema-parser.ts).
 * 
 * IMPORTANT: This file must have NO IMPORTS to avoid breaking config evaluation.
 * When adding a new field type, add its mapping here!
 */

export const FIELD_TS_TYPES: Record<string, string> = {
    // String-based fields
    Input: 'string',
    Textarea: 'string',
    RichEditor: 'string',
    ColorPicker: 'string',
    Select: 'string',
    FileUpload: 'string',
    // Boolean fields
    Switch: 'boolean',
    // Date fields
    DateField: 'Date',
    // Complex fields (Repeater is handled specially in parser)
};
