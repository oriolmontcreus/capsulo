import { z } from 'zod';
import type { DateField } from './datefield.types';

export function datefieldToZod(field: DateField, formData?: Record<string, any>): z.ZodTypeAny {
    // Helper to parse dates strictly
    const parseDate = (val: any): Date | null => {
        if (val instanceof Date) return val;
        if (typeof val === 'string') {
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d;
        }
        return null;
    };

    // Base validation depends on mode
    let schema: z.ZodTypeAny;

    const isValidDateOrEmpty = (val: any) => {
        if (typeof val === 'string' && val === '') return true;
        return parseDate(val) !== null;
    };

    if (field.mode === 'range') {
        schema = z.union([
            z.object({
                start: z.union([z.date(), z.string()]).refine(isValidDateOrEmpty, { message: 'Invalid start date' }),
                end: z.union([z.date(), z.string()]).refine(isValidDateOrEmpty, { message: 'Invalid end date' }),
            }),
            z.literal("")
        ]);
    } else {
        // Single mode
        schema = z.union([z.date(), z.string()]).refine(isValidDateOrEmpty, { message: 'Invalid date' });
    }

    // Handle Optional/Required
    // If not required, it can be optional/null/undefined
    if (!field.required) {
        schema = schema.optional().nullable();
    } else if (typeof field.required === 'function') {
        // Dynamic requirement
        const isRequired = field.required(formData || {});
        if (!isRequired) {
            schema = schema.optional().nullable();
        } else {
            // It is required, so we enforce the base schema (which expects valid date)
            // But we must also ensure it's not null/undefined
            schema = schema.refine((val) => val !== null && val !== undefined && val !== '', {
                message: 'Date is required'
            });
        }
    } else if (field.required) {
        // Static required
        schema = schema.refine((val) => val !== null && val !== undefined && val !== '', {
            message: 'Date is required'
        });
    }

    // Refinements for Date constraints
    // We only apply these if the value exists
    schema = schema.superRefine((val, ctx) => {
        if (!val) return; // Skip checks if empty (and allowed by optional)

        // Helper to normalize date to midnight for day-only comparison
        const normalizeToMidnight = (date: Date): Date => {
            const normalized = new Date(date);
            normalized.setHours(0, 0, 0, 0);
            return normalized;
        };

        // Wrapper to handle single vs range for constraints
        const compareDate = (d: Date) => {
            // Helper to check constraints for a specific date point
            // Min Date
            if (field.minDate) {
                const min = field.minDate === 'today' ? new Date() : new Date(field.minDate);
                // Normalize both dates to midnight for day-only comparison
                const normalizedD = normalizeToMidnight(d);
                const normalizedMin = normalizeToMidnight(min);

                if (normalizedD < normalizedMin) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `Date must be on or after ${normalizedMin.toLocaleDateString()}`,
                    });
                }
            }

            // Max Date
            if (field.maxDate) {
                const max = field.maxDate === 'today' ? new Date() : new Date(field.maxDate);
                // Normalize both dates to midnight for day-only comparison
                const normalizedD = normalizeToMidnight(d);
                const normalizedMax = normalizeToMidnight(max);

                if (normalizedD > normalizedMax) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `Date must be on or before ${normalizedMax.toLocaleDateString()}`,
                    });
                }
            }

            // Disabled configuration
            if (field.disabled) {
                // Day of week
                if (field.disabled.dayOfWeek) {
                    if (field.disabled.dayOfWeek.includes(d.getDay())) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: `This day of the week is disabled`,
                        });
                    }
                }

                // Specific Dates
                if (field.disabled.dates) {
                    const isBad = field.disabled.dates.some(bad => {
                        // Normalize entry to Date (handle both Date objects and strings)
                        let disabledDate: Date;
                        if (bad instanceof Date) {
                            disabledDate = bad;
                        } else if (typeof bad === 'string' || typeof bad === 'number') {
                            disabledDate = new Date(bad);
                        } else {
                            // Skip invalid entries
                            return false;
                        }

                        // Verify the resulting Date is valid
                        if (isNaN(disabledDate.getTime())) {
                            // Skip invalid dates
                            return false;
                        }

                        // Compare year/month/day
                        return (
                            disabledDate.getDate() === d.getDate() &&
                            disabledDate.getMonth() === d.getMonth() &&
                            disabledDate.getFullYear() === d.getFullYear()
                        );
                    });
                    if (isBad) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: `This date is disabled`,
                        });
                    }
                }

                // Before/After (redundant with min/max but part of disabled config often)
                if (field.disabled.before && d < field.disabled.before) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `Date is disabled`,
                    });
                }
                if (field.disabled.after && d > field.disabled.after) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `Date is disabled`,
                    });
                }
            }
        };

        if (field.mode === 'range') {
            const range = val as { start: any; end: any };
            const start = parseDate(range.start);
            const end = parseDate(range.end);

            if (start) compareDate(start);
            if (end) compareDate(end);

            if (start && end && start > end) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `End date must be after start date`,
                });
            }
        } else {
            const date = parseDate(val);
            if (date) compareDate(date);
        }
    });

    return schema;
}
