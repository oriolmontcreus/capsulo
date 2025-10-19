import React from 'react';
import type { Field } from '../core/types';
import { InputField } from '../fields/Input/input.field';
import { TextareaField } from '../fields/Textarea/textarea.field';
import { SelectField } from '../fields/Select/select.field';
import { GridFieldComponent } from '../layouts/Grid/grid.field';

interface FieldRendererProps {
    field: Field;
    value: any;
    onChange: (value: any) => void;
    error?: string;
}

/**
 * Central field renderer that maps field types to their components.
 * This is used by layout components to render nested fields without circular dependencies.
 */
export const FieldRenderer: React.FC<FieldRendererProps> = ({ field, value, onChange, error }) => {
    // Render based on field type
    switch (field.type) {
        case 'input':
            return <InputField field={field} value={value} onChange={onChange} error={error} />;

        case 'textarea':
            return <TextareaField field={field} value={value} onChange={onChange} error={error} />;

        case 'select':
            return <SelectField field={field} value={value} onChange={onChange} error={error} />;

        case 'grid':
            return <GridFieldComponent field={field} value={value} onChange={onChange} error={error} />;

        default:
            console.warn(`No component registered for field type: ${(field as any).type}`);
            return null;
    }
};
