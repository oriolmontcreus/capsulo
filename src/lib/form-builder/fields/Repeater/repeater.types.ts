import type { Field } from '../../core/types';

export interface RepeaterField {
    type: 'repeater';
    name: string;
    label?: string;
    description?: string;
    fields: Field[];
    minItems?: number;
    maxItems?: number;
    defaultValue?: any[];
}
