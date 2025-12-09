import type { GridLayout, ResponsiveValue } from './grid.types';
import type { Field } from '../../core/types';

interface FieldBuilder {
    build(): Field;
}

/**
 * Normalizes a value to ResponsiveValue format
 * - If number: applies to base (mobile-first)
 * - If object: uses as-is
 */
const normalizeResponsive = (value: number | ResponsiveValue): ResponsiveValue => {
    if (typeof value === 'number') {
        return { base: value };
    }
    return value;
};

export class GridBuilder {
    private config: GridLayout;

    constructor(columns?: number | ResponsiveValue) {
        this.config = {
            type: 'grid',
            columns: columns ? normalizeResponsive(columns) : { base: 1, md: 2, lg: 3 },
            gap: { base: 4 }, // Default gap
            fields: []
        };
    }

    /**
     * Set gap between grid items
     * @param gapValue - Single number for all breakpoints, or responsive object
     * @example
     * .gap(4)  // 4 (1rem) on all screens (base)
     * .gap({ base: 2, sm: 3, md: 4, lg: 6 })  // Responsive gaps
     */
    gap(gapValue: number | ResponsiveValue) {
        this.config.gap = normalizeResponsive(gapValue);
        return this;
    }

    contains(fields: (Field | FieldBuilder)[]) {
        // Build any field builders into actual fields
        this.config.fields = fields.map(field =>
            'build' in field ? field.build() : field
        );
        return this;
    }

    hidden(value: boolean = true): this {
        this.config.hidden = value;
        return this;
    }

    build(): GridLayout {
        return this.config;
    }
}

/**
 * Creates a responsive grid layout container
 * 
 * @param columns - Number of columns (single value or responsive object)
 * 
 * @example
 * // Simple: 3 columns on all screens
 * Grid(3).contains([...])
 * 
 * @example
 * // Responsive: 3 cols on lg, 2 on md, 1 on sm
 * Grid({ lg: 3, md: 2, sm: 1 }).contains([...])
 * 
 * @example
 * // With responsive gaps
 * Grid({ lg: 3, md: 2 })
 *   .gap({ lg: 6, md: 4, sm: 2 })
 *   .contains([...])
 */
export const Grid = (columns?: number | ResponsiveValue) => {
    return new GridBuilder(columns);
};
