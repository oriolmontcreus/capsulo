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

/**
 * Base interface for common DateField properties
 */
interface DateFieldBase extends TranslatableField {
    type: 'datefield';
    name: string;
    label?: string;
    description?: string;
    placeholder?: string;
    required?: boolean;

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
    // Table display control
    showInTable?: boolean; // Whether to show this field as a column in a repeater with table variant (default: true)
}

/**
 * DateField for single date selection
 */
interface DateFieldSingle extends DateFieldBase {
    mode: 'single';
    /**
     * Default value for single date mode.
     * Accepts a Date object or an ISO 8601 string (e.g., "2025-11-16T00:00:00.000Z").
     * Prefer using Date objects where possible for type safety and clarity.
     */
    defaultValue?: Date | string;
}

/**
 * DateField for date range selection
 */
interface DateFieldRange extends DateFieldBase {
    mode: 'range';
    /**
     * Default value for date range mode.
     * Must be an object with start and end properties.
     */
    defaultValue?: {
        /**
         * Start date of the range.
         * Accepts a Date object or an ISO 8601 string (e.g., "2025-11-16T00:00:00.000Z").
         * Prefer using Date objects where possible for type safety and clarity.
         */
        start: Date | string;
        /**
         * End date of the range.
         * Accepts a Date object or an ISO 8601 string (e.g., "2025-11-16T00:00:00.000Z").
         * Prefer using Date objects where possible for type safety and clarity.
         */
        end: Date | string;
    };
}

/**
 * Discriminated union for DateField.
 * The mode property determines the shape of the defaultValue.
 * - When mode is 'single', defaultValue must be Date | string | undefined
 * - When mode is 'range', defaultValue must be { start: Date | string; end: Date | string } | undefined
 */
export type DateField = DateFieldSingle | DateFieldRange;
