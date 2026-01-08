/**
 * SchemaRenderer - A standalone component for rendering CMS schemas in documentation.
 *
 * This is a simplified, portable version of the form-builder rendering logic
 * designed specifically for documentation and showcase purposes.
 *
 * Features:
 * - No autosave, no validation, no translations
 * - Clean, read-only-style demo fields
 * - Self-contained with minimal dependencies
 *
 * Usage in your docs project:
 *
 * ```tsx
 * import { SchemaRenderer, createDocsSchema } from './SchemaRenderer';
 *
 * // Define a schema using the builder pattern
 * const MyExampleSchema = createDocsSchema('Hero', [
 *   Input('title').label('Title').placeholder('Enter title...'),
 *   Textarea('description').label('Description').rows(3),
 *   Select('type').label('Type').options([
 *     { label: 'Primary', value: 'primary' },
 *     { label: 'Secondary', value: 'secondary' }
 *   ]),
 *   Switch('featured').label('Featured').defaultValue(false),
 * ], 'Main hero section configuration');
 *
 * // Render it
 * <SchemaRenderer schema={MyExampleSchema} />
 * ```
 */

import React, { useState, useCallback, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type FieldType =
  | 'input'
  | 'textarea'
  | 'select'
  | 'switch'
  | 'colorpicker'
  | 'datefield'
  | 'repeater'
  | 'grid'
  | 'tabs';

export interface BaseField {
  type: FieldType;
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean | ((formData: Record<string, unknown>) => boolean);
  defaultValue?: unknown;
  hidden?: boolean | ((formData: Record<string, unknown>) => boolean);
  translatable?: boolean;
}

export interface InputField extends BaseField {
  type: 'input';
  inputType?: 'text' | 'email' | 'url' | 'password' | 'number';
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface TextareaField extends BaseField {
  type: 'textarea';
  rows?: number;
  minLength?: number;
  maxLength?: number;
}

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectField extends BaseField {
  type: 'select';
  options?: SelectOption[];
  searchable?: boolean;
  multiple?: boolean;
}

export interface SwitchField extends BaseField {
  type: 'switch';
  defaultValue?: boolean;
}

export interface ColorPickerField extends BaseField {
  type: 'colorpicker';
  defaultValue?: string;
}

export interface DateField extends BaseField {
  type: 'datefield';
}

export interface RepeaterField extends BaseField {
  type: 'repeater';
  itemFields: Field[];
  minItems?: number;
  maxItems?: number;
  itemName?: string;
}

export interface GridLayout {
  type: 'grid';
  columns: number;
  fields: Field[];
  gap?: number;
}

export interface TabConfig {
  label: string;
  fields: Field[];
  prefix?: React.ReactNode;
}

export interface TabsLayout {
  type: 'tabs';
  tabs: TabConfig[];
}

export type DataField =
  | InputField
  | TextareaField
  | SelectField
  | SwitchField
  | ColorPickerField
  | DateField
  | RepeaterField;

export type Layout = GridLayout | TabsLayout;

export type Field = DataField | Layout;

export interface Schema {
  name: string;
  description?: string;
  fields: Field[];
  icon?: React.ReactNode;
}

// ============================================================================
// FIELD BUILDERS - Fluent API for schema creation
// ============================================================================

class InputBuilder {
  private field: InputField;

  constructor(name: string) {
    this.field = { type: 'input', name, inputType: 'text' };
  }

  label(value: string): this {
    this.field.label = value;
    return this;
  }

  description(value: string): this {
    this.field.description = value;
    return this;
  }

  placeholder(value: string): this {
    this.field.placeholder = value;
    return this;
  }

  required(value = true): this {
    this.field.required = value;
    return this;
  }

  defaultValue(value: string): this {
    this.field.defaultValue = value;
    return this;
  }

  type(t: 'text' | 'email' | 'url' | 'password' | 'number'): this {
    this.field.inputType = t;
    return this;
  }

  prefix(value: React.ReactNode): this {
    this.field.prefix = value;
    return this;
  }

  suffix(value: React.ReactNode): this {
    this.field.suffix = value;
    return this;
  }

  minLength(value: number): this {
    this.field.minLength = value;
    return this;
  }

  maxLength(value: number): this {
    this.field.maxLength = value;
    return this;
  }

  min(value: number): this {
    this.field.min = value;
    return this;
  }

  max(value: number): this {
    this.field.max = value;
    return this;
  }

  translatable(_enabled = true): this {
    this.field.translatable = true;
    return this;
  }

  hidden(value: boolean | ((formData: Record<string, unknown>) => boolean) = true): this {
    this.field.hidden = value;
    return this;
  }

  build(): InputField {
    return this.field;
  }
}

class TextareaBuilder {
  private field: TextareaField;

  constructor(name: string) {
    this.field = { type: 'textarea', name };
  }

  label(value: string): this {
    this.field.label = value;
    return this;
  }

  description(value: string): this {
    this.field.description = value;
    return this;
  }

  placeholder(value: string): this {
    this.field.placeholder = value;
    return this;
  }

  required(value = true): this {
    this.field.required = value;
    return this;
  }

  defaultValue(value: string): this {
    this.field.defaultValue = value;
    return this;
  }

  rows(value: number): this {
    this.field.rows = value;
    return this;
  }

  minLength(value: number): this {
    this.field.minLength = value;
    return this;
  }

  maxLength(value: number): this {
    this.field.maxLength = value;
    return this;
  }

  translatable(_enabled = true): this {
    this.field.translatable = true;
    return this;
  }

  hidden(value: boolean | ((formData: Record<string, unknown>) => boolean) = true): this {
    this.field.hidden = value;
    return this;
  }

  build(): TextareaField {
    return this.field;
  }
}

class SelectBuilder {
  private field: SelectField;

  constructor(name: string) {
    this.field = { type: 'select', name, options: [] };
  }

  label(value: string): this {
    this.field.label = value;
    return this;
  }

  description(value: string): this {
    this.field.description = value;
    return this;
  }

  placeholder(value: string): this {
    this.field.placeholder = value;
    return this;
  }

  required(value = true): this {
    this.field.required = value;
    return this;
  }

  defaultValue(value: string): this {
    this.field.defaultValue = value;
    return this;
  }

  options(opts: SelectOption[]): this {
    this.field.options = opts;
    return this;
  }

  searchable(value = true): this {
    this.field.searchable = value;
    return this;
  }

  multiple(value = true): this {
    this.field.multiple = value;
    return this;
  }

  hidden(value: boolean | ((formData: Record<string, unknown>) => boolean) = true): this {
    this.field.hidden = value;
    return this;
  }

  build(): SelectField {
    return this.field;
  }
}

class SwitchBuilder {
  private field: SwitchField;

  constructor(name: string) {
    this.field = { type: 'switch', name };
  }

  label(value: string): this {
    this.field.label = value;
    return this;
  }

  description(value: string): this {
    this.field.description = value;
    return this;
  }

  defaultValue(value: boolean): this {
    this.field.defaultValue = value;
    return this;
  }

  hidden(value: boolean | ((formData: Record<string, unknown>) => boolean) = true): this {
    this.field.hidden = value;
    return this;
  }

  build(): SwitchField {
    return this.field;
  }
}

class ColorPickerBuilder {
  private field: ColorPickerField;

  constructor(name: string) {
    this.field = { type: 'colorpicker', name };
  }

  label(value: string): this {
    this.field.label = value;
    return this;
  }

  description(value: string): this {
    this.field.description = value;
    return this;
  }

  defaultValue(value: string): this {
    this.field.defaultValue = value;
    return this;
  }

  build(): ColorPickerField {
    return this.field;
  }
}

class DateFieldBuilder {
  private field: DateField;

  constructor(name: string) {
    this.field = { type: 'datefield', name };
  }

  label(value: string): this {
    this.field.label = value;
    return this;
  }

  description(value: string): this {
    this.field.description = value;
    return this;
  }

  build(): DateField {
    return this.field;
  }
}

class RepeaterBuilder {
  private field: RepeaterField;

  constructor(name: string, itemFields: (Field | { build(): Field })[]) {
    this.field = {
      type: 'repeater',
      name,
      itemFields: itemFields.map((f) => ('build' in f ? f.build() : f)),
    };
  }

  label(value: string): this {
    this.field.label = value;
    return this;
  }

  description(value: string): this {
    this.field.description = value;
    return this;
  }

  minItems(value: number): this {
    this.field.minItems = value;
    return this;
  }

  maxItems(value: number): this {
    this.field.maxItems = value;
    return this;
  }

  itemName(value: string): this {
    this.field.itemName = value;
    return this;
  }

  build(): RepeaterField {
    return this.field;
  }
}

class GridBuilder {
  private layout: GridLayout;

  constructor(columns: number) {
    this.layout = { type: 'grid', columns, fields: [] };
  }

  gap(value: number): this {
    this.layout.gap = value;
    return this;
  }

  contains(fields: (Field | { build(): Field })[]): this {
    this.layout.fields = fields.map((f) => ('build' in f ? f.build() : f));
    return this;
  }

  build(): GridLayout {
    return this.layout;
  }
}

class TabBuilder {
  _label: string;
  _fields: Field[] = [];
  _prefix?: React.ReactNode;

  constructor(label: string, fields: (Field | { build(): Field })[]) {
    this._label = label;
    this._fields = fields.map((f) => ('build' in f ? f.build() : f));
  }

  prefix(value: React.ReactNode): this {
    this._prefix = value;
    return this;
  }

  build(): TabConfig {
    return { label: this._label, fields: this._fields, prefix: this._prefix };
  }
}

class TabsBuilder {
  private layout: TabsLayout;

  constructor() {
    this.layout = { type: 'tabs', tabs: [] };
  }

  tab(
    label: string,
    fields: (Field | { build(): Field })[],
    options?: { prefix?: React.ReactNode }
  ): this {
    const tab = new TabBuilder(label, fields);
    if (options?.prefix) tab.prefix(options.prefix);
    this.layout.tabs.push(tab.build());
    return this;
  }

  build(): TabsLayout {
    return this.layout;
  }
}

// Export builder factories
export const Input = (name: string): InputBuilder => new InputBuilder(name);
export const Textarea = (name: string): TextareaBuilder => new TextareaBuilder(name);
export const Select = (name: string): SelectBuilder => new SelectBuilder(name);
export const Switch = (name: string): SwitchBuilder => new SwitchBuilder(name);
export const ColorPicker = (name: string): ColorPickerBuilder => new ColorPickerBuilder(name);
export const DateField = (name: string): DateFieldBuilder => new DateFieldBuilder(name);
export const Repeater = (
  name: string,
  itemFields: (Field | { build(): Field })[]
): RepeaterBuilder => new RepeaterBuilder(name, itemFields);
export const Grid = (columns: number): GridBuilder => new GridBuilder(columns);
export const Tabs = (): TabsBuilder => new TabsBuilder();
export const Tab = (
  label: string,
  fields: (Field | { build(): Field })[]
): TabBuilder => new TabBuilder(label, fields);

// Schema factory
export function createDocsSchema(
  name: string,
  fields: (Field | { build(): Field })[],
  description?: string,
  icon?: React.ReactNode
): Schema {
  return {
    name,
    description,
    icon,
    fields: fields.map((f) => ('build' in f ? f.build() : f)),
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

function flattenFields(fields: Field[]): DataField[] {
  const result: DataField[] = [];
  for (const field of fields) {
    if (field.type === 'grid') {
      result.push(...flattenFields((field as GridLayout).fields));
    } else if (field.type === 'tabs') {
      for (const tab of (field as TabsLayout).tabs) {
        result.push(...flattenFields(tab.fields));
      }
    } else {
      result.push(field as DataField);
    }
  }
  return result;
}

function initializeFormData(fields: Field[]): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const flat = flattenFields(fields);
  for (const field of flat) {
    data[field.name] = field.defaultValue ?? (field.type === 'switch' ? false : '');
  }
  return data;
}

// ============================================================================
// BASIC UI COMPONENTS (inline CSS-in-JS for portability)
// ============================================================================

const styles = {
  wrapper: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    color: '#e4e4e7',
    backgroundColor: 'transparent',
  } as React.CSSProperties,
  card: {
    background: 'linear-gradient(135deg, rgba(39, 39, 42, 0.8), rgba(24, 24, 27, 0.9))',
    borderRadius: '12px',
    border: '1px solid rgba(63, 63, 70, 0.5)',
    overflow: 'hidden',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(63, 63, 70, 0.5)',
    background: 'rgba(24, 24, 27, 0.5)',
  } as React.CSSProperties,
  iconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: 'rgba(59, 130, 246, 0.1)',
    color: '#3b82f6',
  } as React.CSSProperties,
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#fafafa',
  } as React.CSSProperties,
  description: {
    margin: '4px 0 0 0',
    fontSize: '14px',
    color: '#a1a1aa',
  } as React.CSSProperties,
  body: {
    padding: '24px',
  } as React.CSSProperties,
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  } as React.CSSProperties,
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  } as React.CSSProperties,
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#e4e4e7',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  } as React.CSSProperties,
  required: {
    color: '#ef4444',
  } as React.CSSProperties,
  translatable: {
    color: '#22c55e',
    fontSize: '12px',
  } as React.CSSProperties,
  input: {
    padding: '10px 12px',
    fontSize: '14px',
    borderRadius: '8px',
    border: '1px solid rgba(63, 63, 70, 0.6)',
    background: 'rgba(24, 24, 27, 0.8)',
    color: '#fafafa',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  } as React.CSSProperties,
  textarea: {
    padding: '10px 12px',
    fontSize: '14px',
    borderRadius: '8px',
    border: '1px solid rgba(63, 63, 70, 0.6)',
    background: 'rgba(24, 24, 27, 0.8)',
    color: '#fafafa',
    outline: 'none',
    resize: 'vertical',
    minHeight: '80px',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  } as React.CSSProperties,
  select: {
    padding: '10px 12px',
    fontSize: '14px',
    borderRadius: '8px',
    border: '1px solid rgba(63, 63, 70, 0.6)',
    background: 'rgba(24, 24, 27, 0.8)',
    color: '#fafafa',
    outline: 'none',
    cursor: 'pointer',
  } as React.CSSProperties,
  switchContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  } as React.CSSProperties,
  switch: {
    position: 'relative',
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    background: 'rgba(63, 63, 70, 0.8)',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    border: 'none',
  } as React.CSSProperties,
  switchOn: {
    background: '#3b82f6',
  } as React.CSSProperties,
  switchThumb: {
    position: 'absolute',
    top: '2px',
    left: '2px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#fff',
    transition: 'transform 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  } as React.CSSProperties,
  switchThumbOn: {
    transform: 'translateX(20px)',
  } as React.CSSProperties,
  colorPreview: {
    width: '100%',
    height: '40px',
    borderRadius: '8px',
    border: '1px solid rgba(63, 63, 70, 0.6)',
    cursor: 'pointer',
  } as React.CSSProperties,
  colorInputWrapper: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  } as React.CSSProperties,
  descriptionText: {
    fontSize: '13px',
    color: '#71717a',
    marginTop: '2px',
  } as React.CSSProperties,
  tabsContainer: {
    display: 'flex',
    gap: '4px',
    marginBottom: '16px',
    padding: '4px',
    background: 'rgba(24, 24, 27, 0.5)',
    borderRadius: '10px',
  } as React.CSSProperties,
  tab: {
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '6px',
    background: 'transparent',
    color: '#a1a1aa',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  } as React.CSSProperties,
  tabActive: {
    background: 'rgba(39, 39, 42, 0.9)',
    color: '#fafafa',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  } as React.CSSProperties,
  grid: {
    display: 'grid',
    gap: '16px',
  } as React.CSSProperties,
  repeater: {
    border: '1px solid rgba(63, 63, 70, 0.4)',
    borderRadius: '8px',
    padding: '16px',
    background: 'rgba(24, 24, 27, 0.3)',
  } as React.CSSProperties,
  repeaterHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  } as React.CSSProperties,
  repeaterItem: {
    padding: '12px',
    background: 'rgba(39, 39, 42, 0.5)',
    borderRadius: '6px',
    marginBottom: '8px',
    border: '1px solid rgba(63, 63, 70, 0.3)',
  } as React.CSSProperties,
  addButton: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    border: '1px dashed rgba(63, 63, 70, 0.6)',
    borderRadius: '6px',
    background: 'transparent',
    color: '#a1a1aa',
    cursor: 'pointer',
    transition: 'all 0.2s',
    width: '100%',
    marginTop: '8px',
  } as React.CSSProperties,
  removeButton: {
    padding: '4px 8px',
    fontSize: '12px',
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  } as React.CSSProperties,
};

// ============================================================================
// FIELD COMPONENTS
// ============================================================================

interface FieldComponentProps<T extends DataField = DataField> {
  field: T;
  value: unknown;
  onChange: (value: unknown) => void;
  formData: Record<string, unknown>;
}

const FieldLabel: React.FC<{ field: DataField }> = ({ field }) => (
  <label style={styles.label}>
    {field.label || field.name}
    {field.required && <span style={styles.required}>*</span>}
    {field.translatable && <span style={styles.translatable}>✦</span>}
  </label>
);

const FieldDescription: React.FC<{ text?: string }> = ({ text }) =>
  text ? <p style={styles.descriptionText}>{text}</p> : null;

const InputFieldComponent: React.FC<FieldComponentProps<InputField>> = ({
  field,
  value,
  onChange,
}) => (
  <div style={styles.field}>
    <FieldLabel field={field} />
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {field.prefix && (
        <span style={{ color: '#a1a1aa', fontSize: '14px' }}>{field.prefix}</span>
      )}
      <input
        type={field.inputType || 'text'}
        value={(value as string) ?? ''}
        onChange={(e) =>
          onChange(field.inputType === 'number' ? Number(e.target.value) : e.target.value)
        }
        placeholder={field.placeholder}
        style={{ ...styles.input, flex: 1 }}
        onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
        onBlur={(e) => (e.target.style.borderColor = 'rgba(63, 63, 70, 0.6)')}
      />
      {field.suffix && (
        <span style={{ color: '#a1a1aa', fontSize: '14px' }}>{field.suffix}</span>
      )}
    </div>
    <FieldDescription text={field.description} />
  </div>
);

const TextareaFieldComponent: React.FC<FieldComponentProps<TextareaField>> = ({
  field,
  value,
  onChange,
}) => (
  <div style={styles.field}>
    <FieldLabel field={field} />
    <textarea
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      rows={field.rows || 3}
      style={styles.textarea}
      onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
      onBlur={(e) => (e.target.style.borderColor = 'rgba(63, 63, 70, 0.6)')}
    />
    <FieldDescription text={field.description} />
  </div>
);

const SelectFieldComponent: React.FC<FieldComponentProps<SelectField>> = ({
  field,
  value,
  onChange,
}) => (
  <div style={styles.field}>
    <FieldLabel field={field} />
    <select
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value)}
      style={styles.select}
    >
      {field.placeholder && (
        <option value="" disabled>
          {field.placeholder}
        </option>
      )}
      {field.options?.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
    <FieldDescription text={field.description} />
  </div>
);

const SwitchFieldComponent: React.FC<FieldComponentProps<SwitchField>> = ({
  field,
  value,
  onChange,
}) => {
  const isOn = Boolean(value);
  return (
    <div style={styles.field}>
      <div style={styles.switchContainer}>
        <button
          type="button"
          onClick={() => onChange(!isOn)}
          style={{ ...styles.switch, ...(isOn ? styles.switchOn : {}) }}
          aria-pressed={isOn}
        >
          <span
            style={{ ...styles.switchThumb, ...(isOn ? styles.switchThumbOn : {}) }}
          />
        </button>
        <span style={styles.label}>{field.label || field.name}</span>
      </div>
      <FieldDescription text={field.description} />
    </div>
  );
};

const ColorPickerFieldComponent: React.FC<FieldComponentProps<ColorPickerField>> = ({
  field,
  value,
  onChange,
}) => (
  <div style={styles.field}>
    <FieldLabel field={field} />
    <div style={styles.colorInputWrapper}>
      <input
        type="color"
        value={(value as string) || field.defaultValue || '#3b82f6'}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...styles.colorPreview, width: '60px', height: '36px', padding: 0 }}
      />
      <input
        type="text"
        value={(value as string) || field.defaultValue || '#3b82f6'}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...styles.input, flex: 1 }}
        onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
        onBlur={(e) => (e.target.style.borderColor = 'rgba(63, 63, 70, 0.6)')}
      />
    </div>
    <FieldDescription text={field.description} />
  </div>
);

const DateFieldComponent: React.FC<FieldComponentProps<DateField>> = ({
  field,
  value,
  onChange,
}) => (
  <div style={styles.field}>
    <FieldLabel field={field} />
    <input
      type="date"
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value)}
      style={styles.input}
      onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
      onBlur={(e) => (e.target.style.borderColor = 'rgba(63, 63, 70, 0.6)')}
    />
    <FieldDescription text={field.description} />
  </div>
);

interface RepeaterItem {
  _id: string;
  [key: string]: unknown;
}

const RepeaterFieldComponent: React.FC<FieldComponentProps<RepeaterField>> = ({
  field,
  value,
  onChange,
  formData,
}) => {
  const items = (value as RepeaterItem[]) || [];

  const addItem = () => {
    const newItem: RepeaterItem = { _id: `item_${Date.now()}` };
    field.itemFields.forEach((f) => {
      if ('name' in f) newItem[f.name] = (f as DataField).defaultValue ?? '';
    });
    onChange([...items, newItem]);
  };

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
  };

  const updateItem = (index: number, fieldName: string, val: unknown) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [fieldName]: val };
    onChange(updated);
  };

  return (
    <div style={styles.field}>
      <FieldLabel field={field} />
      <div style={styles.repeater}>
        {items.map((item, idx) => (
          <div key={item._id} style={styles.repeaterItem}>
            <div style={styles.repeaterHeader}>
              <span style={{ fontSize: '13px', color: '#a1a1aa' }}>
                {field.itemName || 'Item'} {idx + 1}
              </span>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                style={styles.removeButton}
              >
                Remove
              </button>
            </div>
            <div style={styles.fieldGroup}>
              {flattenFields(field.itemFields).map((itemField) => (
                <DocsFieldRenderer
                  key={itemField.name}
                  field={itemField}
                  value={item[itemField.name]}
                  onChange={(v) => updateItem(idx, itemField.name, v)}
                  formData={formData}
                />
              ))}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          style={styles.addButton}
          disabled={field.maxItems !== undefined && items.length >= field.maxItems}
        >
          + Add {field.itemName || 'Item'}
        </button>
      </div>
      <FieldDescription text={field.description} />
    </div>
  );
};

// ============================================================================
// LAYOUT COMPONENTS
// ============================================================================

interface LayoutProps {
  field: Layout;
  formData: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
}

const GridLayoutComponent: React.FC<LayoutProps> = ({ field, formData, onChange }) => {
  const gridLayout = field as GridLayout;
  return (
    <div style={{ ...styles.grid, gridTemplateColumns: `repeat(${gridLayout.columns}, 1fr)` }}>
      {gridLayout.fields.map((f, idx) => {
        if ('name' in f) {
          return (
            <DocsFieldRenderer
              key={(f as DataField).name}
              field={f as DataField}
              value={formData[(f as DataField).name]}
              onChange={(v) => onChange((f as DataField).name, v)}
              formData={formData}
            />
          );
        }
        return <LayoutRenderer key={`layout-${idx}`} field={f} formData={formData} onChange={onChange} />;
      })}
    </div>
  );
};

const TabsLayoutComponent: React.FC<LayoutProps> = ({ field, formData, onChange }) => {
  const [activeTab, setActiveTab] = useState(0);
  const tabsLayout = field as TabsLayout;

  return (
    <div>
      <div style={styles.tabsContainer}>
        {tabsLayout.tabs.map((tab, idx) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActiveTab(idx)}
            style={{ ...styles.tab, ...(activeTab === idx ? styles.tabActive : {}) }}
          >
            {tab.prefix}
            {tab.label}
          </button>
        ))}
      </div>
      <div style={styles.fieldGroup}>
        {tabsLayout.tabs[activeTab]?.fields.map((f, idx) => {
          if ('name' in f) {
            return (
              <DocsFieldRenderer
                key={(f as DataField).name}
                field={f as DataField}
                value={formData[(f as DataField).name]}
                onChange={(v) => onChange((f as DataField).name, v)}
                formData={formData}
              />
            );
          }
          return <LayoutRenderer key={`layout-${idx}`} field={f} formData={formData} onChange={onChange} />;
        })}
      </div>
    </div>
  );
};

const LayoutRenderer: React.FC<LayoutProps> = ({ field, formData, onChange }) => {
  if (field.type === 'grid') {
    return <GridLayoutComponent field={field} formData={formData} onChange={onChange} />;
  }
  if (field.type === 'tabs') {
    return <TabsLayoutComponent field={field} formData={formData} onChange={onChange} />;
  }
  return null;
};

// ============================================================================
// FIELD RENDERER (Maps field type to component)
// ============================================================================

interface DocsFieldRendererProps {
  field: DataField;
  value: unknown;
  onChange: (value: unknown) => void;
  formData: Record<string, unknown>;
}

const DocsFieldRenderer: React.FC<DocsFieldRendererProps> = ({
  field,
  value,
  onChange,
  formData,
}) => {
  // Check hidden state
  if (field.hidden) {
    const isHidden = typeof field.hidden === 'function' ? field.hidden(formData) : field.hidden;
    if (isHidden) return null;
  }

  const props = { field, value, onChange, formData } as FieldComponentProps;

  switch (field.type) {
    case 'input':
      return <InputFieldComponent {...(props as FieldComponentProps<InputField>)} />;
    case 'textarea':
      return <TextareaFieldComponent {...(props as FieldComponentProps<TextareaField>)} />;
    case 'select':
      return <SelectFieldComponent {...(props as FieldComponentProps<SelectField>)} />;
    case 'switch':
      return <SwitchFieldComponent {...(props as FieldComponentProps<SwitchField>)} />;
    case 'colorpicker':
      return <ColorPickerFieldComponent {...(props as FieldComponentProps<ColorPickerField>)} />;
    case 'datefield':
      return <DateFieldComponent {...(props as FieldComponentProps<DateField>)} />;
    case 'repeater':
      return <RepeaterFieldComponent {...(props as FieldComponentProps<RepeaterField>)} />;
    default:
      return (
        <div style={{ color: '#ef4444', fontSize: '13px' }}>
          Unknown field type: {(field as DataField).type}
        </div>
      );
  }
};

// ============================================================================
// MAIN SCHEMA RENDERER
// ============================================================================

export interface SchemaRendererProps {
  /** The schema to render */
  schema: Schema;
  /** Optional initial values for the form */
  initialValues?: Record<string, unknown>;
  /** Optional callback when form values change */
  onValuesChange?: (values: Record<string, unknown>) => void;
  /** Optional custom styles for the wrapper */
  style?: React.CSSProperties;
  /** Optional class name for the wrapper */
  className?: string;
}

export const SchemaRenderer: React.FC<SchemaRendererProps> = ({
  schema,
  initialValues,
  onValuesChange,
  style,
  className,
}) => {
  const [formData, setFormData] = useState<Record<string, unknown>>(() => ({
    ...initializeFormData(schema.fields),
    ...initialValues,
  }));

  const handleChange = useCallback(
    (fieldName: string, value: unknown) => {
      setFormData((prev) => {
        const updated = { ...prev, [fieldName]: value };
        onValuesChange?.(updated);
        return updated;
      });
    },
    [onValuesChange]
  );

  // Clone icon with proper styling
  const styledIcon = useMemo(() => {
    if (!schema.icon) return null;
    if (React.isValidElement(schema.icon)) {
      return React.cloneElement(schema.icon as React.ReactElement, {
        style: { width: '20px', height: '20px' },
      });
    }
    return schema.icon;
  }, [schema.icon]);

  return (
    <div style={{ ...styles.wrapper, ...style }} className={className}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          {styledIcon && <div style={styles.iconContainer}>{styledIcon}</div>}
          <div>
            <h3 style={styles.title}>{schema.name}</h3>
            {schema.description && <p style={styles.description}>{schema.description}</p>}
          </div>
        </div>

        {/* Body with fields */}
        <div style={styles.body}>
          <div style={styles.fieldGroup as React.CSSProperties}>
            {schema.fields.map((field, idx) => {
              // Handle layouts
              if (field.type === 'grid' || field.type === 'tabs') {
                return (
                  <LayoutRenderer
                    key={`layout-${idx}`}
                    field={field as Layout}
                    formData={formData}
                    onChange={handleChange}
                  />
                );
              }

              // Handle data fields
              const dataField = field as DataField;
              return (
                <DocsFieldRenderer
                  key={dataField.name}
                  field={dataField}
                  value={formData[dataField.name]}
                  onChange={(v) => handleChange(dataField.name, v)}
                  formData={formData}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchemaRenderer;
