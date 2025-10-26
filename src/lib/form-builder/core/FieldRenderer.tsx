import React from 'react';
import type { Field } from '../core/types';

interface FieldRendererProps {
    field: Field;
    value: any;
    onChange: (value: any) => void;
    error?: string;
    fieldErrors?: Record<string, string>;
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
 */
export const FieldRenderer: React.FC<FieldRendererProps> = React.memo(({ field, value, onChange, error, fieldErrors }) => {
    if (!getFieldComponentFn) {
        console.error('FieldRenderer: getFieldComponent not initialized. Did you forget to import FieldRegistry?');
        return null;
    }

    const FieldComponent = getFieldComponentFn(field.type);

    if (!FieldComponent) {
        console.warn(`No component registered for field type: ${field.type}`);
        return null;
    }

    return <FieldComponent field={field} value={value} onChange={onChange} error={error} fieldErrors={fieldErrors} />;
}, (prevProps, nextProps) => {
    // Only re-render if value, error, or fieldErrors changed
    return (
        prevProps.value === nextProps.value &&
        prevProps.error === nextProps.error &&
        prevProps.fieldErrors === nextProps.fieldErrors &&
        prevProps.field === nextProps.field
    );
});
