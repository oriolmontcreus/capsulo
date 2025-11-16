import React from 'react';
import type { DateField as DateFieldType } from './datefield.types';
import type { ComponentData } from '../../core/types';
import { Button as ShadcnButton } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { RangeCalendar } from '@/components/ui/calendar-rac';
import { Field, FieldDescription, FieldError } from '@/components/ui/field';
import { FieldLabel } from '../../components/FieldLabel';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateField as DateFieldRAC, DateInput as DateInputRAC, dateInputStyle } from '@/components/ui/datefield-rac';
import { DateRangePicker, Group, Popover as RACPopover, Dialog, Button as RACButton } from 'react-aria-components';
import { CalendarIcon, ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { es, fr, de, enUS, ja, zhCN, pt, it, ru, ar, type Locale } from 'date-fns/locale';
import { CalendarDate, type DateValue } from '@internationalized/date';
import config from '../../../../../capsulo.config';

type DateRangeValue = { start: DateValue; end: DateValue } | null;

// Locale mapping for date-fns
const localeMap: Record<string, Locale> = {
    'es': es,
    'es-ES': es,
    'fr': fr,
    'fr-FR': fr,
    'de': de,
    'de-DE': de,
    'en': enUS,
    'en-US': enUS,
    'ja': ja,
    'ja-JP': ja,
    'zh': zhCN,
    'zh-CN': zhCN,
    'pt': pt,
    'pt-PT': pt,
    'pt-BR': pt,
    'it': it,
    'it-IT': it,
    'ru': ru,
    'ru-RU': ru,
    'ar': ar,
    'ar-SA': ar,
};

interface DateFieldProps {
    field: DateFieldType;
    value: any;
    onChange: (value: any) => void;
    error?: string;
    fieldPath?: string;
    componentData?: ComponentData;
    formData?: Record<string, any>;
}

export const DateFieldComponent: React.FC<DateFieldProps> = React.memo(({
    field,
    value,
    onChange,
    error,
    fieldPath,
    componentData,
    formData
}) => {
    const [open, setOpen] = React.useState(false);

    // Parse the value to a Date object (for calendar variant)
    const dateValue = React.useMemo(() => {
        if (!value) return undefined;
        if (value instanceof Date) return value;
        if (typeof value === 'string') return new Date(value);
        return undefined;
    }, [value]);

    // Parse value to CalendarDate (for input variant)
    const calendarDateValue = React.useMemo(() => {
        if (!value) return undefined;
        try {
            const date = value instanceof Date ? value : new Date(value);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            return new CalendarDate(year, month, day);
        } catch {
            return undefined;
        }
    }, [value]);

    // Parse range value (for range mode)
    const rangeValue = React.useMemo((): DateRangeValue => {
        if (!value || typeof value !== 'object' || !('start' in value) || !('end' in value)) {
            return null;
        }
        try {
            const startDate = value.start instanceof Date ? value.start : new Date(value.start);
            const endDate = value.end instanceof Date ? value.end : new Date(value.end);

            return {
                start: new CalendarDate(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, startDate.getUTCDate()),
                end: new CalendarDate(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, endDate.getUTCDate()),
            };
        } catch {
            return null;
        }
    }, [value]);

    // Get the date-fns locale object
    const getDateFnsLocale = (): Locale | undefined => {
        const localeToUse = field.locale || config.i18n?.defaultLocale;

        if (!localeToUse) return undefined;

        // Try exact match first
        if (localeMap[localeToUse]) {
            return localeMap[localeToUse];
        }

        // Try language code only (e.g., 'es' from 'es-ES')
        const langCode = localeToUse.split('-')[0];
        return localeMap[langCode];
    };

    // Format the date for display
    const formatDate = (date: Date | undefined): string => {
        if (!date) return field.placeholder || 'Select date';

        const locale = field.locale || config.i18n?.defaultLocale || navigator.language;

        if (field.format === 'custom' && field.customFormat) {
            return date.toLocaleDateString(locale, field.customFormat);
        }

        const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
            short: { year: 'numeric', month: 'numeric', day: 'numeric' },
            medium: { year: 'numeric', month: 'short', day: 'numeric' },
            long: { year: 'numeric', month: 'long', day: 'numeric' },
            full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
        };

        const options = formatOptions[field.format || 'medium'];
        return date.toLocaleDateString(locale, options);
    };

    // Handle date selection from calendar
    const handleSelect = (selectedDate: Date | undefined) => {
        onChange(selectedDate ? selectedDate.toISOString() : undefined);
        setOpen(false);
    };

    // Handle date change from input variant
    const handleInputChange = (dateValue: DateValue | null) => {
        if (!dateValue) {
            onChange(undefined);
            return;
        }
        // Convert DateValue to ISO string
        const date = new Date(dateValue.year, dateValue.month - 1, dateValue.day);
        onChange(date.toISOString());
    };

    // Handle range change
    const handleRangeChange = (range: DateRangeValue) => {
        if (!range) {
            onChange(undefined);
            return;
        }
        const start = new Date(range.start.year, range.start.month - 1, range.start.day);
        const end = new Date(range.end.year, range.end.month - 1, range.end.day);
        onChange({
            start: start.toISOString(),
            end: end.toISOString(),
        });
    };

    // Build disabled matcher function
    const getDisabledMatcher = () => {
        if (!field.disabled && !field.minDate && !field.maxDate) {
            return undefined;
        }

        return (date: Date) => {
            // Check min/max dates
            if (field.minDate) {
                const min = field.minDate === 'today' ? new Date() : (typeof field.minDate === 'string' ? new Date(field.minDate) : field.minDate);
                if (date < min) return true;
            }

            if (field.maxDate) {
                const max = field.maxDate === 'today' ? new Date() : (typeof field.maxDate === 'string' ? new Date(field.maxDate) : field.maxDate);
                if (date > max) return true;
            }

            // Check disabled config
            if (field.disabled) {
                const { before, after, dayOfWeek, dates, matcher } = field.disabled;

                if (before && date < before) return true;
                if (after && date > after) return true;
                if (dayOfWeek && dayOfWeek.includes(date.getDay())) return true;
                if (dates && dates.some(d => d.toDateString() === date.toDateString())) return true;
                if (matcher && matcher(date)) return true;
            }

            return false;
        };
    };

    // Render range mode
    if (field.mode === 'range') {
        return (
            <DateRangePicker
                value={rangeValue}
                onChange={handleRangeChange}
                isRequired={field.required}
                isInvalid={!!error}
                className="*:not-first:mt-2"
            >
                <FieldLabel
                    htmlFor={field.name}
                    required={field.required}
                    fieldPath={fieldPath}
                    translatable={field.translatable}
                    componentData={componentData}
                    formData={formData}
                >
                    {field.label || field.name}
                </FieldLabel>

                {field.description && (
                    <FieldDescription>{field.description}</FieldDescription>
                )}

                <div className="flex">
                    <Group className={cn(dateInputStyle, "pe-9")}>
                        <DateInputRAC slot="start" unstyled />
                        <span aria-hidden="true" className="px-2 text-muted-foreground/70">
                            -
                        </span>
                        <DateInputRAC slot="end" unstyled />
                    </Group>
                    <RACButton className="z-10 -ms-9 -me-px flex w-9 items-center justify-center rounded-e-md text-muted-foreground/80 transition-[color,box-shadow] outline-none hover:text-foreground data-focus-visible:border-ring data-focus-visible:ring-[3px] data-focus-visible:ring-ring/50">
                        <CalendarIcon size={16} />
                    </RACButton>
                </div>

                <RACPopover
                    className="z-50 rounded-md border bg-background text-popover-foreground shadow-lg outline-hidden data-entering:animate-in data-exiting:animate-out data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2"
                    offset={4}
                >
                    <Dialog className="max-h-[inherit] overflow-auto p-2">
                        <RangeCalendar />
                    </Dialog>
                </RACPopover>

                {error && <FieldError>{error}</FieldError>}
            </DateRangePicker>
        );
    }

    // Render input variant (single mode)
    if (field.variant === 'input') {
        return (
            <DateFieldRAC
                value={calendarDateValue}
                onChange={handleInputChange}
                isRequired={field.required}
                isInvalid={!!error}
                className="flex flex-col gap-2"
            >
                <FieldLabel
                    htmlFor={field.name}
                    required={field.required}
                    fieldPath={fieldPath}
                    translatable={field.translatable}
                    componentData={componentData}
                    formData={formData}
                >
                    {field.label || field.name}
                </FieldLabel>

                {field.description && (
                    <FieldDescription>{field.description}</FieldDescription>
                )}

                <DateInputRAC className={cn(error && "border-destructive")} />

                {error && <FieldError>{error}</FieldError>}
            </DateFieldRAC>
        );
    }

    // Render calendar variant (default)
    return (
        <Field data-invalid={!!error}>
            <FieldLabel
                htmlFor={field.name}
                required={field.required}
                fieldPath={fieldPath}
                translatable={field.translatable}
                componentData={componentData}
                formData={formData}
            >
                {field.label || field.name}
            </FieldLabel>

            {field.description && (
                <FieldDescription>{field.description}</FieldDescription>
            )}

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <ShadcnButton
                        variant="outline"
                        id={field.name}
                        className={cn(
                            "w-full justify-between font-normal",
                            !dateValue && "text-muted-foreground",
                            error && "border-destructive"
                        )}
                        aria-invalid={!!error}
                    >
                        {formatDate(dateValue)}
                        <ChevronDownIcon className="h-4 w-4 opacity-50" />
                    </ShadcnButton>
                </PopoverTrigger>

                <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={dateValue}
                        onSelect={handleSelect}
                        disabled={getDisabledMatcher()}
                        captionLayout={field.captionLayout || 'dropdown'}
                        fromYear={field.fromYear}
                        toYear={field.toYear}
                        weekStartsOn={field.weekStartsOn}
                        locale={getDateFnsLocale()}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>

            {error && <FieldError>{error}</FieldError>}
        </Field>
    );
});

DateFieldComponent.displayName = 'DateFieldComponent';
