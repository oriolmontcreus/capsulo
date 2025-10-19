import type { Field } from '../../core/types';
import type { ReactNode } from 'react';

export interface TabItem {
    label: string;
    icon?: ReactNode;
    fields: Field[];
}

export interface TabsField {
    type: 'tabs';
    tabs: TabItem[];
}
