import React from 'react';
import type { GridField } from './grid.types';
import { FieldRenderer } from '../../core/FieldRenderer';

interface GridFieldProps {
    field: GridField;
    value: any;
    onChange: (value: any) => void;
    error?: string;
}

export const GridFieldComponent: React.FC<GridFieldProps> = ({ field, value, onChange, error }) => {
    // Convert Tailwind spacing value to rem (1 unit = 0.25rem)
    const spacingToRem = (spacing: number) => `${spacing * 0.25}rem`;

    // Build inline styles for grid (columns + gaps) - avoids Tailwind JIT compilation issues
    const getGridStyles = () => {
        const styles: React.CSSProperties = {};

        // Set grid columns (mobile-first - base is the default)
        const { columns, gap } = field;

        if (columns) {
            const baseCols = columns.base ?? 1;
            styles.gridTemplateColumns = `repeat(${baseCols}, minmax(0, 1fr))`;
        }

        // Set base gap (mobile-first approach)
        if (gap?.base !== undefined) {
            styles.gap = spacingToRem(gap.base);
        }

        return styles;
    };

    // Generate unique ID for this grid to scope the styles
    const gridId = React.useId();

    // Generate responsive CSS for columns and gaps
    const generateResponsiveStyles = () => {
        const { columns, gap } = field;
        let css = '';

        // Responsive columns
        if (columns) {
            if (columns.sm !== undefined) {
                css += `
                    @media (min-width: 640px) {
                        [data-grid-id="${gridId}"] {
                            grid-template-columns: repeat(${columns.sm}, minmax(0, 1fr)) !important;
                        }
                    }
                `;
            }
            if (columns.md !== undefined) {
                css += `
                    @media (min-width: 768px) {
                        [data-grid-id="${gridId}"] {
                            grid-template-columns: repeat(${columns.md}, minmax(0, 1fr)) !important;
                        }
                    }
                `;
            }
            if (columns.lg !== undefined) {
                css += `
                    @media (min-width: 1024px) {
                        [data-grid-id="${gridId}"] {
                            grid-template-columns: repeat(${columns.lg}, minmax(0, 1fr)) !important;
                        }
                    }
                `;
            }
            if (columns.xl !== undefined) {
                css += `
                    @media (min-width: 1280px) {
                        [data-grid-id="${gridId}"] {
                            grid-template-columns: repeat(${columns.xl}, minmax(0, 1fr)) !important;
                        }
                    }
                `;
            }
        }

        // Responsive gaps
        if (gap) {
            if (gap.sm !== undefined) {
                css += `
                    @media (min-width: 640px) {
                        [data-grid-id="${gridId}"] {
                            gap: ${spacingToRem(gap.sm)} !important;
                        }
                    }
                `;
            }
            if (gap.md !== undefined) {
                css += `
                    @media (min-width: 768px) {
                        [data-grid-id="${gridId}"] {
                            gap: ${spacingToRem(gap.md)} !important;
                        }
                    }
                `;
            }
            if (gap.lg !== undefined) {
                css += `
                    @media (min-width: 1024px) {
                        [data-grid-id="${gridId}"] {
                            gap: ${spacingToRem(gap.lg)} !important;
                        }
                    }
                `;
            }
            if (gap.xl !== undefined) {
                css += `
                    @media (min-width: 1280px) {
                        [data-grid-id="${gridId}"] {
                            gap: ${spacingToRem(gap.xl)} !important;
                        }
                    }
                `;
            }
        }

        return css;
    };

    return (
        <div className="space-y-2">
            {field.label && (
                <div className="text-sm font-medium">{field.label}</div>
            )}
            {field.description && (
                <div className="text-sm text-muted-foreground">{field.description}</div>
            )}

            {/* Inject responsive styles for columns and gaps */}
            <style dangerouslySetInnerHTML={{ __html: generateResponsiveStyles() }} />

            <div
                data-grid-id={gridId}
                className="grid [&>[role=group]]:w-auto [&>[role=group]>*]:w-full"
                style={getGridStyles()}
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
