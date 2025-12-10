import type { DateField, DateFormat, CaptionLayout, DateFieldDisabledConfig, DateFieldVariant } from './datefield.types';

class DateFieldBuilder {
    private field: DateField;

    constructor(name: string) {
        this.field = {
            type: 'datefield',
            name,
            mode: 'single',
            variant: 'calendar',
            format: 'medium',
            captionLayout: 'dropdown',
        };
    }

    label(value: string): this {
        this.field.label = value;
        return this;
    }

    description(value: string): this {
        this.field.description = value;
        return this;
    }

    placeholder(value: string): this {
        this.field.placeholder = value;
        return this;
    }

    required(value: boolean = true): this {
        this.field.required = value;
        return this;
    }

    /**
     * Set the default value for the date field.
     * - For 'single' mode: pass a Date object or ISO 8601 string (e.g., "2025-11-16T00:00:00.000Z")
     * - For 'range' mode: pass an object with start and end properties { start: Date | string, end: Date | string }
     * 
     * Prefer using Date objects where possible for type safety.
     */
    defaultValue(value: Date | string | { start: Date | string; end: Date | string }): this {
        // Type narrowing based on value shape
        if (value && typeof value === 'object' && 'start' in value && 'end' in value) {
            // Range mode
            (this.field as Extract<DateField, { mode: 'range' }>).defaultValue = value;
        } else {
            // Single mode
            (this.field as Extract<DateField, { mode: 'single' }>).defaultValue = value as Date | string;
        }
        return this;
    }

    /**
     * Set the date field mode
     * @param mode - 'single' (one date) or 'range' (date range)
     */
    mode(mode: 'single'): this;
    mode(mode: 'range'): this;
    mode(mode: 'single' | 'range'): this {
        if (mode === 'range') {
            this.field = {
                ...this.field,
                mode: 'range',
                defaultValue: undefined,
            } as Extract<DateField, { mode: 'range' }>;
        } else {
            this.field = {
                ...this.field,
                mode: 'single',
                defaultValue: undefined,
            } as Extract<DateField, { mode: 'single' }>;
        }
        return this;
    }

    /**
     * Set the date field variant
     * @param variant - 'calendar' (popover with calendar) or 'input' (typed date input)
     */
    variant(variant: DateFieldVariant): this {
        this.field.variant = variant;
        return this;
    }

    /**
     * Set the date format
     * @param format - 'short' | 'medium' | 'long' | 'full' | 'custom'
     */
    format(format: DateFormat): this {
        this.field.format = format;
        return this;
    }

    /**
     * Set custom date formatting options (when format is 'custom')
     * @example
     * .customFormat({ year: 'numeric', month: 'long', day: 'numeric' })
     */
    customFormat(options: Intl.DateTimeFormatOptions): this {
        this.field.format = 'custom';
        this.field.customFormat = options;
        return this;
    }

    /**
     * Set the caption layout for the calendar
     * @param layout - 'dropdown' | 'dropdown-months' | 'dropdown-years' | 'label'
     */
    captionLayout(layout: CaptionLayout): this {
        this.field.captionLayout = layout;
        return this;
    }

    /**
     * Configure disabled dates
     * @example
     * .disabled({ before: new Date(), dayOfWeek: [0, 6] }) // Disable past dates and weekends
     */
    disabled(config: DateFieldDisabledConfig): this {
        this.field.disabled = config;
        return this;
    }

    /**
     * Set minimum selectable date
     */
    minDate(date: Date | string): this {
        this.field.minDate = date;
        return this;
    }

    /**
     * Set maximum selectable date
     */
    maxDate(date: Date | string): this {
        this.field.maxDate = date;
        return this;
    }

    /**
     * Show year dropdown in calendar
     */
    showYearDropdown(value: boolean = true): this {
        this.field.showYearDropdown = value;
        if (value && this.field.captionLayout === 'label') {
            this.field.captionLayout = 'dropdown';
        }
        return this;
    }

    /**
     * Show month dropdown in calendar
     */
    showMonthDropdown(value: boolean = true): this {
        this.field.showMonthDropdown = value;
        if (value && this.field.captionLayout === 'label') {
            this.field.captionLayout = 'dropdown';
        }
        return this;
    }

    /**
     * Set the year range for the dropdown
     * @param from - Start year
     * @param to - End year (defaults to current year + 10)
     */
    yearRange(from: number, to?: number): this {
        this.field.fromYear = from;
        this.field.toYear = to || new Date().getFullYear() + 10;
        return this;
    }

    /**
     * Set which day the week starts on
     * @param day - 0 (Sunday) to 6 (Saturday)
     */
    weekStartsOn(day: 0 | 1 | 2 | 3 | 4 | 5 | 6): this {
        this.field.weekStartsOn = day;
        return this;
    }

    /**
     * Set the locale for date formatting
     * @example .locale('es-ES') for Spanish
     */
    locale(locale: string): this {
        this.field.locale = locale;
        return this;
    }

    showInTable(value: boolean = true): this {
        this.field.showInTable = value;
        return this;
    }

    /**
     * @param value - Boolean to hide/show field, or function receiving formData to determine visibility. Defaults to `true`.
     */
    hidden(value: boolean | ((formData: any) => boolean) = true): this {
        this.field.hidden = value;
        return this;
    }

    build(): DateField {
        return this.field;
    }
}

export function DateField(name: string): DateFieldBuilder {
    return new DateFieldBuilder(name);
}
