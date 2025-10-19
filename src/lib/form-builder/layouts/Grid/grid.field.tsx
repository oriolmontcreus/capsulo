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
    // Convert Tailwind spacing value to rem (1 unit = 0.25rem)
    const spacingToRem = (spacing: number) => `${spacing * 0.25}rem`;

    // Build Tailwind grid classes (only for columns, not gaps)
    const getGridClasses = () => {
        const classes: string[] = ['grid'];

        const { columns } = field;

        // Add responsive column classes
        if (columns) {
            if (columns.sm !== undefined) classes.push(`grid-cols-${columns.sm}`);
            if (columns.md !== undefined) classes.push(`md:grid-cols-${columns.md}`);
            if (columns.lg !== undefined) classes.push(`lg:grid-cols-${columns.lg}`);
            if (columns.xl !== undefined) classes.push(`xl:grid-cols-${columns.xl}`);
        }

        return classes.join(' ');
    };

    // Build inline styles for responsive gaps using CSS variables
    const getGapStyles = () => {
        const { gap } = field;

        if (!gap) return {};

        // Use CSS custom properties for responsive gaps
        const styles: React.CSSProperties & Record<string, string> = {};

        // Set CSS variables for each breakpoint
        if (gap.sm !== undefined) {
            styles['--gap-sm'] = spacingToRem(gap.sm);
        }
        if (gap.md !== undefined) {
            styles['--gap-md'] = spacingToRem(gap.md);
        }
        if (gap.lg !== undefined) {
            styles['--gap-lg'] = spacingToRem(gap.lg);
        }
        if (gap.xl !== undefined) {
            styles['--gap-xl'] = spacingToRem(gap.xl);
        }

        // Apply base gap (mobile-first approach)
        if (gap.sm !== undefined) {
            styles.gap = spacingToRem(gap.sm);
        }

        return styles;
    };

    // Generate unique ID for this grid to scope the styles
    const gridId = React.useId();

    return (
        <div className="space-y-2">
            {field.label && (
                <div className="text-sm font-medium">{field.label}</div>
            )}
            {field.description && (
                <div className="text-sm text-muted-foreground">{field.description}</div>
            )}

            {/* Inline responsive gap styles */}
            {field.gap && (
                <style dangerouslySetInnerHTML={{
                    __html: `
                        ${field.gap.md !== undefined ? `
                            @media (min-width: 768px) {
                                [data-grid-id="${gridId}"] {
                                    gap: ${spacingToRem(field.gap.md)} !important;
                                }
                            }
                        ` : ''}
                        ${field.gap.lg !== undefined ? `
                            @media (min-width: 1024px) {
                                [data-grid-id="${gridId}"] {
                                    gap: ${spacingToRem(field.gap.lg)} !important;
                                }
                            }
                        ` : ''}
                        ${field.gap.xl !== undefined ? `
                            @media (min-width: 1280px) {
                                [data-grid-id="${gridId}"] {
                                    gap: ${spacingToRem(field.gap.xl)} !important;
                                }
                            }
                        ` : ''}
                    `
                }} />
            )}

            <div
                data-grid-id={gridId}
                className={cn(getGridClasses(), "[&>[role=group]]:w-auto [&>[role=group]>*]:w-full")}
                style={getGapStyles()}
            >
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
