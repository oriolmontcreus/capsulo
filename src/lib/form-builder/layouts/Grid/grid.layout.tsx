'use client';

import React, { useCallback } from 'react';
import type { GridLayout } from './grid.types';
import type { ColSpanValue, ResponsiveValue } from '../../core/translation.types';
import { FieldRenderer } from '../../core/FieldRenderer';
import { HighlightedFieldWrapper } from '../../core/HighlightedFieldWrapper';
import type { Field } from '../../core/types';

interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

interface GridFieldProps {
    field: GridLayout;
    value: any;
    onChange: (value: any) => void;
    error?: string;
    fieldErrors?: Record<string, string>;
    componentData?: ComponentData;
    formData?: Record<string, any>;
    highlightedField?: string;
    highlightRequestId?: number;
}

// Memoized wrapper for nested fields to prevent re-renders
const GridFieldItem = React.memo<{
    childField: Field;
    fieldName: string;
    fieldPath: string;
    value: any;
    onChange: (fieldName: string, value: any) => void;
    error?: string;
    fieldErrors?: Record<string, string>;
    componentData?: ComponentData;
    formData?: Record<string, any>;
    highlightedField?: string;
    highlightRequestId?: number;
}>(({ childField, fieldName, fieldPath, value, onChange, error, fieldErrors, componentData, formData, highlightedField, highlightRequestId }) => {
    const handleChange = useCallback((newValue: any) => {
        onChange(fieldName, newValue);
    }, [fieldName, onChange]);

    // Only wrap data fields (those with names) with highlight wrapper
    const isHighlighted = highlightedField === fieldName && 'name' in childField;
    const fieldContent = (
        <FieldRenderer
            field={childField}
            value={value}
            onChange={handleChange}
            error={error}
            fieldErrors={fieldErrors}
            fieldPath={fieldPath}
            componentData={componentData}
            formData={formData}
            highlightedField={highlightedField}
            highlightRequestId={highlightRequestId}
        />
    );

    if ('name' in childField) {
        return (
            <HighlightedFieldWrapper
                fieldName={fieldName}
                isHighlighted={isHighlighted}
                highlightRequestId={highlightRequestId}
            >
                {fieldContent}
            </HighlightedFieldWrapper>
        );
    }

    return fieldContent;
}, (prev, next) => {
    return (
        prev.value === next.value &&
        prev.error === next.error &&
        prev.fieldErrors === next.fieldErrors &&
        prev.fieldPath === next.fieldPath &&
        prev.componentData === next.componentData &&
        prev.formData === next.formData &&
        prev.highlightedField === next.highlightedField &&
        prev.highlightRequestId === next.highlightRequestId
    );
});

export const GridFieldComponent: React.FC<GridFieldProps> = ({ field, value, onChange, error, fieldErrors, componentData, formData, highlightedField, highlightRequestId }) => {
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

    // Convert colSpan to responsive CSS
    const generateFieldColSpanStyles = () => {
        let css = '';
        const totalCols = field.columns?.base ?? 1;
        
        field.fields.forEach((childField) => {
            if ('colSpan' in childField && childField.colSpan) {
                const fieldName = 'name' in childField ? childField.name : '';
                if (!fieldName) return;
                
                const colSpan = childField.colSpan;
                
                if (colSpan === "full") {
                    // Full width on all breakpoints
                    css += `
                        [data-grid-id="${gridId}"] [data-field-name="${fieldName}"] {
                            grid-column: 1 / -1 !important;
                        }
                    `;
                } else if (typeof colSpan === "number") {
                    // Single number - generate responsive CSS for each breakpoint
                    // Base breakpoint
                    const baseSpan = Math.min(colSpan, field.columns?.base ?? 1);
                    css += `
                        [data-grid-id="${gridId}"] [data-field-name="${fieldName}"] {
                            grid-column: span ${baseSpan} / span ${baseSpan} !important;
                        }
                    `;
                    
                    // sm breakpoint
                    if (field.columns?.sm !== undefined) {
                        const smSpan = Math.min(colSpan, field.columns.sm);
                        css += `
                            @media (min-width: 640px) {
                                [data-grid-id="${gridId}"] [data-field-name="${fieldName}"] {
                                    grid-column: span ${smSpan} / span ${smSpan} !important;
                                }
                            }
                        `;
                    }
                    
                    // md breakpoint
                    if (field.columns?.md !== undefined) {
                        const mdSpan = Math.min(colSpan, field.columns.md);
                        css += `
                            @media (min-width: 768px) {
                                [data-grid-id="${gridId}"] [data-field-name="${fieldName}"] {
                                    grid-column: span ${mdSpan} / span ${mdSpan} !important;
                                }
                            }
                        `;
                    }
                    
                    // lg breakpoint
                    if (field.columns?.lg !== undefined) {
                        const lgSpan = Math.min(colSpan, field.columns.lg);
                        css += `
                            @media (min-width: 1024px) {
                                [data-grid-id="${gridId}"] [data-field-name="${fieldName}"] {
                                    grid-column: span ${lgSpan} / span ${lgSpan} !important;
                                }
                            }
                        `;
                    }
                    
                    // xl breakpoint
                    if (field.columns?.xl !== undefined) {
                        const xlSpan = Math.min(colSpan, field.columns.xl);
                        css += `
                            @media (min-width: 1280px) {
                                [data-grid-id="${gridId}"] [data-field-name="${fieldName}"] {
                                    grid-column: span ${xlSpan} / span ${xlSpan} !important;
                                }
                            }
                        `;
                    }
                } else {
                    // Responsive object
                    if (colSpan.base !== undefined) {
                        const span = Math.min(colSpan.base, totalCols);
                        css += `
                            [data-grid-id="${gridId}"] [data-field-name="${fieldName}"] {
                                grid-column: span ${span} / span ${span} !important;
                            }
                        `;
                    }
                    if (colSpan.sm !== undefined) {
                        const span = Math.min(colSpan.sm, field.columns?.sm ?? totalCols);
                        css += `
                            @media (min-width: 640px) {
                                [data-grid-id="${gridId}"] [data-field-name="${fieldName}"] {
                                    grid-column: span ${span} / span ${span} !important;
                                }
                            }
                        `;
                    }
                    if (colSpan.md !== undefined) {
                        const span = Math.min(colSpan.md, field.columns?.md ?? totalCols);
                        css += `
                            @media (min-width: 768px) {
                                [data-grid-id="${gridId}"] [data-field-name="${fieldName}"] {
                                    grid-column: span ${span} / span ${span} !important;
                                }
                            }
                        `;
                    }
                    if (colSpan.lg !== undefined) {
                        const span = Math.min(colSpan.lg, field.columns?.lg ?? totalCols);
                        css += `
                            @media (min-width: 1024px) {
                                [data-grid-id="${gridId}"] [data-field-name="${fieldName}"] {
                                    grid-column: span ${span} / span ${span} !important;
                                }
                            }
                        `;
                    }
                    if (colSpan.xl !== undefined) {
                        const span = Math.min(colSpan.xl, field.columns?.xl ?? totalCols);
                        css += `
                            @media (min-width: 1280px) {
                                [data-grid-id="${gridId}"] [data-field-name="${fieldName}"] {
                                    grid-column: span ${span} / span ${span} !important;
                                }
                            }
                        `;
                    }
                }
            }
        });
        
        return css;
    };

    // Memoized handler that updates a single nested field
    const handleNestedFieldChange = useCallback((fieldName: string, newValue: any) => {
        // Only send the changed field, not all values
        onChange({
            [fieldName]: newValue
        });
    }, [onChange]);

    return (
        <>
            {/* Inject responsive styles for columns and gaps */}
            <style dangerouslySetInnerHTML={{ __html: generateResponsiveStyles() + generateFieldColSpanStyles() }} />

            <div
                data-grid-id={gridId}
                className="grid *:[[role=group]]:w-auto *:[[role=group]>*]:w-full"
                style={getGridStyles()}
            >
                {field.fields.map((childField, index) => {
                    // Only data fields have names, not layouts like Grid
                    const fieldName = 'name' in childField ? childField.name : `field-${index}`;
                    const nestedValue = value?.[fieldName];
                    const nestedError = fieldErrors && 'name' in childField ? fieldErrors[childField.name] : undefined;

                    return (
                        <div key={fieldName} data-field-name={fieldName}>
                            <GridFieldItem
                                childField={childField}
                                fieldName={fieldName}
                                fieldPath={fieldName}
                                value={nestedValue}
                                onChange={handleNestedFieldChange}
                                error={nestedError}
                                fieldErrors={fieldErrors}
                                componentData={componentData}
                                formData={formData}
                                highlightedField={highlightedField}
                                highlightRequestId={highlightRequestId}
                            />
                        </div>
                    );
                })}
            </div>
        </>
    );
};
