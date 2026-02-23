'use client';

import React from 'react';
import type { DateField as DateFieldType } from './datefield.types';
import type { ComponentData } from '../../core/types';
import { Button as ShadcnButton } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Field, FieldDescription, FieldError } from '@/components/ui/field';
import { FieldLabel } from '../../components/FieldLabel';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateField as DateFieldRAC, DateInput as DateInputRAC } from '@/components/ui/datefield-rac';
import { ChevronDownIcon, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalendarDate, type DateValue } from '@internationalized/date';
import config from '@/capsulo.config';

import { RangeCalendarPicker } from './range-calendar-picker';
import type { DateRange } from 'react-day-picker';
import { getDateFnsLocale } from './datefield.utils';

type DateRangeValue = DateRange | undefined;

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

    const isRequired = React.useMemo(() => {
        if (typeof field.required === 'function') {
            return field.required(formData);
        }
        return !!field.required;
    }, [field.required, formData]);

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
        if (!value || typeof value !== 'object') return undefined;
        // The RangeCalendarPicker expects Date objects for from/to
        return {
            from: value.from ? new Date(value.from) : undefined,
            to: value.to ? new Date(value.to) : undefined,
        } as DateRange;
    }, [value]);

    // Format the date for display
    const formatDate = (date: Date | undefined): string => {
        if (!date) return field.placeholder || 'Select date';

        const locale = field.locale || config.i18n?.defaultLocale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');

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
        const date = new Date(Date.UTC(dateValue.year, dateValue.month - 1, dateValue.day));
        onChange(date.toISOString());
    };

    // Handle range change
    const handleRangeChange = (range: DateRangeValue) => {
        // Convert DateRange from RangeCalendarPicker (Date objects) to ISO strings for the field's value
        onChange({
            from: range?.from ? range.from.toISOString() : undefined,
            to: range?.to ? range.to.toISOString() : undefined,
        });
    };

    // Format the date range for display
    const formatRangeDisplay = (range: DateRangeValue): string => {
        if (!range?.from) return field.placeholder || 'Select date range';
        const fromDate = formatDate(range.from);
        const toDate = range.to ? formatDate(range.to) : '';
        return `${fromDate} - ${toDate}`.trim();
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

                <RangeCalendarPicker
                    value={rangeValue}
                    onChange={handleRangeChange}
                    locale={field.locale || config.i18n?.defaultLocale}
                    fromYear={field.fromYear}
                    toYear={field.toYear}
                    trigger={(
                        <ShadcnButton
                            variant="outline"
                            id={field.name}
                            className={cn(
                                "w-full justify-between font-normal bg-input hover:bg-input! dark:bg-input dark:hover:bg-input!"
                            )}
                        >
                            {formatRangeDisplay(rangeValue)}
                            <CalendarIcon className="size-4 opacity-50" />
                        </ShadcnButton>
                    )}
                />

                {error && <FieldError>{error}</FieldError>}
            </Field>
        );
    }

    // Render input variant (single mode)
    if (field.variant === 'input') {
        return (
            <DateFieldRAC
                value={calendarDateValue}
                onChange={handleInputChange}
                isRequired={isRequired}
                isInvalid={!!error}
                className="flex flex-col gap-2"
                aria-label={field.label || field.name}
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

                <DateInputRAC />

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
                            "w-full justify-between font-normal bg-input hover:bg-input! dark:bg-input dark:hover:bg-input!"
                        )}
                    >
                        {formatDate(dateValue)}
                        <ChevronDownIcon className="size-4 opacity-50" />
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
                        locale={getDateFnsLocale(field.locale || config.i18n?.defaultLocale)}
                        fixedWeeks={field.fixedWeeks}
                        showOutsideDays={field.showOutsideDays ?? field.fixedWeeks}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>

            {error && <FieldError>{error}</FieldError>}
        </Field>
    );
});

DateFieldComponent.displayName = 'DateFieldComponent';
