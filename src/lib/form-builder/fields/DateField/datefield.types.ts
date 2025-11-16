import type { TranslatableField } from '../../core/translation.types';

export type DateFormat = 'short' | 'medium' | 'long' | 'full' | 'custom';
export type CaptionLayout = 'dropdown' | 'dropdown-months' | 'dropdown-years' | 'label';
export type DateFieldVariant = 'calendar' | 'input';

export interface DateFieldDisabledConfig {
    before?: Date;
    after?: Date;
    dayOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
    dates?: Date[];
    matcher?: (date: Date) => boolean;
}

export interface DateField extends TranslatableField {
    type: 'datefield';
    name: string;
    label?: string;
    description?: string;
    placeholder?: string;
    required?: boolean;
    defaultValue?: Date | string;

    // UI variant
    variant?: DateFieldVariant; // 'calendar' (popover) or 'input' (typed input)

    // Date picker configuration (for calendar variant)
    format?: DateFormat;
    customFormat?: Intl.DateTimeFormatOptions; // For custom formatting
    captionLayout?: CaptionLayout;

    // Date constraints
    disabled?: DateFieldDisabledConfig;
    minDate?: Date | string;
    maxDate?: Date | string;

    // UI options
    showYearDropdown?: boolean;
    showMonthDropdown?: boolean;
    fromYear?: number; // Start year for dropdown
    toYear?: number; // End year for dropdown

    // Additional options
    weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, etc.
    locale?: string; // For localization (e.g., 'en-US', 'es-ES')
}
