import type { Field } from '../../core/types';

export type RepeaterVariant = 'card' | 'table';

export interface RepeaterField<TFormData = unknown> {
    type: 'repeater';
    name: string;
    label?: string;
    description?: string;
    fields: Field<TFormData>[];
    minItems?: number;
    maxItems?: number;
    defaultValue?: any[];
    itemName?: string;
    itemPluralName?: string;
    variant?: RepeaterVariant;
    hidden?: boolean | ((formData: TFormData) => boolean);
}
