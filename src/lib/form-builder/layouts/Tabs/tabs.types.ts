import type { Field } from '../../core/types';
import type { ReactNode } from 'react';

export interface TabItem {
    label: string;
    prefix?: ReactNode;
    suffix?: ReactNode;
    fields: Field[];
}

export interface TabsLayout {
    type: 'tabs';
    tabs: TabItem[];
}
