import type { Field } from '../../core/types';

export type ResponsiveValue = {
    base?: number; // Base/mobile (< 640px)
    sm?: number;   // Small screens (640px+)
    md?: number;   // Medium screens (768px+)
    lg?: number;   // Large screens (1024px+)
    xl?: number;   // Extra large screens (1280px+)
};

export interface GridLayout {
    type: 'grid';
    columns?: ResponsiveValue;
    gap?: ResponsiveValue;
    fields: Field[];
    hidden?: boolean | ((formData: any) => boolean);
}
