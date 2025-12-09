import React from 'react';
import type { Field } from '../core/types';

interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

interface FieldRendererProps {
    field: Field;
    value: any;
    onChange: (value: any) => void;
    error?: string;
    fieldErrors?: Record<string, string>;
    fieldPath?: string;
    componentData?: ComponentData;
    formData?: Record<string, any>;
    highlightedField?: string;
}

// This will be set by FieldRegistry to avoid circular dependency
let getFieldComponentFn: ((type: string) => React.ComponentType<any> | null) | null = null;

export const setFieldComponentGetter = (fn: (type: string) => React.ComponentType<any> | null) => {
    getFieldComponentFn = fn;
};

/**
 * Central field renderer that maps field types to their components.
 * This is used by layout components to render nested fields without circular dependencies.
 * Uses the FieldRegistry for O(1) lookup performance.
 * Memoized to prevent unnecessary re-renders when parent re-renders.
 * Enhanced with translation support for translatable fields.
 */
const FieldRendererComponent: React.FC<FieldRendererProps> = ({ field, value, onChange, error, fieldErrors, fieldPath, componentData, formData, highlightedField }) => {
    if (!getFieldComponentFn) {
        console.error('FieldRenderer: getFieldComponent not initialized. Did you forget to import FieldRegistry?');
        return null;
    }

    if (field.hidden) {
        return null;
    }

    const FieldComponent = getFieldComponentFn(field.type);

    if (!FieldComponent) {
        console.warn(`No component registered for field type: ${field.type}`);
        return null;
    }

    // Pass fieldPath to field components so they can handle translation icons internally
    // Also pass highlightedField for layout components that need it
    return <FieldComponent
        field={field}
        value={value}
        onChange={onChange}
        error={error}
        fieldErrors={fieldErrors}
        fieldPath={fieldPath}
        componentData={componentData}
        formData={formData}
        highlightedField={highlightedField}
    />;
};

export const FieldRenderer = React.memo(FieldRendererComponent);
