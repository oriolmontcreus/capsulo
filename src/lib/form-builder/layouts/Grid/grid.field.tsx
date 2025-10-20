import React from 'react';
import type { GridLayout } from './grid.types';
import { FieldRenderer } from '../../core/FieldRenderer';

interface GridFieldProps {
    field: GridLayout;
    value: any;
    onChange: (value: any) => void;
    error?: string;
    fieldErrors?: Record<string, string>;
}

export const GridFieldComponent: React.FC<GridFieldProps> = ({ field, value, onChange, error, fieldErrors }) => {
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
        <>
            {/* Inject responsive styles for columns and gaps */}
            <style dangerouslySetInnerHTML={{ __html: generateResponsiveStyles() }} />

            <div
                data-grid-id={gridId}
                className="grid [&>[role=group]]:w-auto [&>[role=group]>*]:w-full"
                style={getGridStyles()}
            >
                {field.fields.map((childField, index) => {
                    // Only data fields have names, not layouts like Grid
                    const fieldName = 'name' in childField ? childField.name : `field-${index}`;
                    const nestedValue = value?.[fieldName];
                    const nestedError = fieldErrors && 'name' in childField ? fieldErrors[childField.name] : undefined;

                    const handleNestedChange = (newValue: any) => {
                        onChange({
                            ...value,
                            [fieldName]: newValue
                        });
                    };

                    return (
                        <FieldRenderer
                            key={fieldName}
                            field={childField}
                            value={nestedValue}
                            onChange={handleNestedChange}
                            error={nestedError}
                            fieldErrors={fieldErrors}
                        />
                    );
                })}
            </div>
        </>
    );
};
