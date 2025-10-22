import type { Field } from '../../core/types';
import type { ReactNode } from 'react';

export interface TabItem {
    label: string;
    prefix?: ReactNode;
    suffix?: ReactNode;
    fields: Field[];
}

export type TabsVariant = 'default' | 'vertical';

export interface TabsLayout {
    type: 'tabs';
    tabs: TabItem[];
    variant?: TabsVariant;
}
