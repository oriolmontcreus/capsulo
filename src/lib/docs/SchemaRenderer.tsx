/**
 * SchemaRenderer - A lightweight component for rendering CMS schemas in documentation.
 *
 * This is a simplified version designed for documentation and showcase purposes.
 * It uses the existing field components from form-builder/fields.
 *
 * Usage:
 * ```tsx
 * import { SchemaRenderer } from './docs/SchemaRenderer';
 * import { HeroSchema } from '@/components/capsulo/hero/hero.schema';
 *
 * <SchemaRenderer schema={HeroSchema} />
 * ```
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { Field, Schema, DataField } from '@/lib/form-builder/core/types';
import { FieldRenderer } from '@/lib/form-builder/core/FieldRenderer';
import '@/lib/form-builder/fields/FieldRegistry';

// ============================================================================
// TYPES
// ============================================================================

interface GridLayout {
  type: 'grid';
  columns: number;
  fields: Field[];
  gap?: number;
}

interface TabConfig {
  label: string;
  fields: Field[];
  prefix?: React.ReactNode;
}

interface TabsLayout {
  type: 'tabs';
  tabs: TabConfig[];
}

type Layout = GridLayout | TabsLayout;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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
    const f = field as DataField & { defaultValue?: unknown };
    if (field.type === 'switch') {
      data[field.name] = f.defaultValue ?? false;
    } else if (field.type === 'fileUpload') {
      data[field.name] = f.defaultValue ?? { files: [] };
    } else {
      data[field.name] = f.defaultValue ?? '';
    }
  }
  return data;
}

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
  /** Optional custom class name for the wrapper */
  className?: string;
}

export const SchemaRenderer: React.FC<SchemaRendererProps> = ({
  schema,
  initialValues,
  onValuesChange,
  className,
}) => {
  const [formData, setFormData] = useState<Record<string, unknown>>(() => ({
    ...initializeFormData(schema.fields),
    ...initialValues,
  }));

  const handleFieldChange = useCallback(
    (fieldName: string, value: unknown) => {
      setFormData((prev) => {
        const updated = { ...prev, [fieldName]: value };
        onValuesChange?.(updated);
        return updated;
      });
    },
    [onValuesChange]
  );

  const handleLayoutChange = useCallback(
    (layoutValue: Record<string, unknown>) => {
      setFormData((prev) => {
        const updated = { ...prev, ...layoutValue };
        onValuesChange?.(updated);
        return updated;
      });
    },
    [onValuesChange]
  );

  // Clone icon with proper styling
  const styledIcon = useMemo(() => {
    if (!schema.icon) return null;
    if (React.isValidElement<{ className?: string }>(schema.icon)) {
      const existingClassName = schema.icon.props.className || '';
      return React.cloneElement(schema.icon, {
        className: `size-5 ${existingClassName}`.trim(),
      });
    }
    return schema.icon;
  }, [schema.icon]);

  // Pre-compute layout field values
  const layoutFieldsMap = useMemo(() => {
    const map: Record<string, DataField[]> = {};
    schema.fields.forEach((field, index) => {
      if (field.type === 'grid' || field.type === 'tabs') {
        map[`layout-${index}`] = flattenFields([field]);
      }
    });
    return map;
  }, [schema.fields]);

  return (
    <div className={className}>
      <div className="rounded-xl border border-border/50 bg-gradient-to-br from-zinc-800/80 to-zinc-900/90 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border/50 bg-zinc-900/50">
          {styledIcon && (
            <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary">
              {styledIcon}
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {schema.name}
            </h3>
            {schema.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {schema.description}
              </p>
            )}
          </div>
        </div>

        {/* Body with fields */}
        <div className="p-6">
          <div className="space-y-5">
            {schema.fields.map((field, index) => {
              // Handle layouts (Grid, Tabs)
              if (field.type === 'grid' || field.type === 'tabs') {
                const layoutKey = `layout-${index}`;
                const nestedDataFields = layoutFieldsMap[layoutKey] || [];

                // Map field names to their current values
                const layoutValue: Record<string, unknown> = {};
                nestedDataFields.forEach((dataField) => {
                  layoutValue[dataField.name] = formData[dataField.name];
                });

                return (
                  <FieldRenderer
                    key={layoutKey}
                    field={field}
                    value={layoutValue}
                    onChange={handleLayoutChange}
                    formData={formData as Record<string, any>}
                  />
                );
              }

              // Handle data fields
              if ('name' in field) {
                const dataField = field as DataField;
                return (
                  <FieldRenderer
                    key={dataField.name}
                    field={field}
                    value={formData[dataField.name]}
                    onChange={(value) => handleFieldChange(dataField.name, value)}
                    formData={formData as Record<string, any>}
                  />
                );
              }

              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchemaRenderer;
