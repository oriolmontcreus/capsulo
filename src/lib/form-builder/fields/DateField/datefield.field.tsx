import React from 'react';
import type { DateField as DateFieldType } from './datefield.types';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Field, FieldDescription, FieldError } from '@/components/ui/field';
import { FieldLabel } from '../../components/FieldLabel';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { es, fr, de, enUS, ja, zhCN, pt, it, ru, ar, type Locale } from 'date-fns/locale';
import config from '../../../../../capsulo.config';

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

interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

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

    // Parse the value to a Date object
    const dateValue = React.useMemo(() => {
        if (!value) return undefined;
        if (value instanceof Date) return value;
        if (typeof value === 'string') return new Date(value);
        return undefined;
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

    // Handle date selection
    const handleSelect = (selectedDate: Date | undefined) => {
        onChange(selectedDate ? selectedDate.toISOString() : undefined);
        setOpen(false);
    };

    // Build disabled matcher function
    const getDisabledMatcher = () => {
        if (!field.disabled && !field.minDate && !field.maxDate) {
            return undefined;
        }

        return (date: Date) => {
            // Check min/max dates
            if (field.minDate) {
                const min = typeof field.minDate === 'string' ? new Date(field.minDate) : field.minDate;
                if (date < min) return true;
            }

            if (field.maxDate) {
                const max = typeof field.maxDate === 'string' ? new Date(field.maxDate) : field.maxDate;
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
                    <Button
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
                    </Button>
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
