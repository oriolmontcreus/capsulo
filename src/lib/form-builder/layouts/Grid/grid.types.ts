import type { Field } from '../../core/types';

export interface GridField {
    type: 'grid';
    name: string;
    label?: string;
    description?: string;
    columns?: {
        sm?: number;  // Small screens (640px+)
        md?: number;  // Medium screens (768px+)
        lg?: number;  // Large screens (1024px+)
        xl?: number;  // Extra large screens (1280px+)
    };
    gap?: number; // Gap between grid items (Tailwind spacing scale)
    fields: Field[]; // Nested fields within the grid
}
