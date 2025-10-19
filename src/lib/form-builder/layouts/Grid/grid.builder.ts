import type { GridField } from './grid.types';
import type { Field } from '../../core/types';

interface FieldBuilder {
    build(): Field;
}

export class GridBuilder {
    private config: GridField;

    constructor(columns?: { sm?: number; md?: number; lg?: number; xl?: number }) {
        this.config = {
            type: 'grid',
            name: `grid-${Date.now()}`, // Auto-generate unique name
            columns: columns || { sm: 1, md: 2, lg: 3 },
            gap: 4,
            fields: []
        };
    }

    label(label: string) {
        this.config.label = label;
        return this;
    }

    description(description: string) {
        this.config.description = description;
        return this;
    }

    gap(gap: number) {
        this.config.gap = gap;
        return this;
    }

    contains(fields: (Field | FieldBuilder)[]) {
        // Build any field builders into actual fields
        this.config.fields = fields.map(field =>
            'build' in field ? field.build() : field
        );
        return this;
    }

    build(): GridField {
        return this.config;
    }
}

/**
 * Creates a responsive grid layout container
 * 
 * @example
 * Grid({ lg: 3, md: 2, sm: 1 }).contains([
 *   Input('name').label('Name'),
 *   Input('email').label('Email'),
 *   Input('phone').label('Phone')
 * ])
 */
export const Grid = (columns?: { sm?: number; md?: number; lg?: number; xl?: number }) => {
    return new GridBuilder(columns);
};
