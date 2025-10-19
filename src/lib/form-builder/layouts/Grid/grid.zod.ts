import { z } from 'zod';
import type { GridField } from './grid.types';

/**
 * Grid fields don't need validation - they're just layout containers
 * The nested fields handle their own validation
 */
export const gridToZod = (field: GridField): z.ZodTypeAny => {
    return z.any().optional();
};
