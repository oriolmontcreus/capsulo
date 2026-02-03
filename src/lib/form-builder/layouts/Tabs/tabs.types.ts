import type { Field } from '../../core/types';
import type { ReactNode } from 'react';

export interface TabItem<TFormData = unknown> {
    label: string;
    prefix?: ReactNode;
    suffix?: ReactNode;
    fields: Field<TFormData>[];
}

export type TabsVariant = 'default' | 'vertical';

export interface TabsLayout<TFormData = unknown> {
    type: 'tabs';
    tabs: TabItem<TFormData>[];
    variant?: TabsVariant;
    className?: string;
    hidden?: boolean | ((formData: TFormData) => boolean);
}
