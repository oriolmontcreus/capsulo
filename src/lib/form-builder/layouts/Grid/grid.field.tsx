import React from 'react';
import type { GridField } from './grid.types';
import { FieldRenderer } from '../../core/FieldRenderer';
import { cn } from '@/lib/utils';

interface GridFieldProps {
    field: GridField;
    value: any;
    onChange: (value: any) => void;
    error?: string;
}

export const GridFieldComponent: React.FC<GridFieldProps> = ({ field, value, onChange, error }) => {
    // Build Tailwind grid classes based on responsive columns
    const getGridClasses = () => {
        const classes: string[] = ['grid'];

        const { columns, gap } = field;

        // Add gap
        if (gap !== undefined) {
            classes.push(`gap-${gap}`);
        }

        // Add responsive column classes
        if (columns) {
            if (columns.sm) classes.push(`grid-cols-${columns.sm}`);
            if (columns.md) classes.push(`md:grid-cols-${columns.md}`);
            if (columns.lg) classes.push(`lg:grid-cols-${columns.lg}`);
            if (columns.xl) classes.push(`xl:grid-cols-${columns.xl}`);
        }

        return classes.join(' ');
    };

    return (
        <div className="space-y-2">
            {field.label && (
                <div className="text-sm font-medium">{field.label}</div>
            )}
            {field.description && (
                <div className="text-sm text-muted-foreground">{field.description}</div>
            )}

            <div className={cn(getGridClasses(), "[&>[role=group]]:w-auto [&>[role=group]>*]:w-full")}>
                {field.fields.map((childField, index) => {
                    // Store nested field values in an object keyed by field name
                    const nestedValue = value?.[childField.name];

                    const handleNestedChange = (newValue: any) => {
                        onChange({
                            ...value,
                            [childField.name]: newValue
                        });
                    };

                    return (
                        <FieldRenderer
                            key={childField.name || index}
                            field={childField}
                            value={nestedValue}
                            onChange={handleNestedChange}
                            error={error}
                        />
                    );
                })}
            </div>
        </div>
    );
};
