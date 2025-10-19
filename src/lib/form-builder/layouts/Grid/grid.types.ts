import type { Field } from '../../core/types';

export type ResponsiveValue = {
    base?: number; // Base/mobile (< 640px)
    sm?: number;   // Small screens (640px+)
    md?: number;   // Medium screens (768px+)
    lg?: number;   // Large screens (1024px+)
    xl?: number;   // Extra large screens (1280px+)
};

export interface GridField {
    type: 'grid';
    name: string;
    label?: string;
    description?: string;
    columns?: ResponsiveValue;
    gap?: ResponsiveValue; // Responsive gap between grid items (Tailwind spacing scale)
    fields: Field[]; // Nested fields within the grid
}
