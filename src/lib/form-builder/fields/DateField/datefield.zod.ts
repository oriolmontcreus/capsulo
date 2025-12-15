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

        // Wrapper to handle single vs range for constraints
        const compareDate = (d: Date) => {
            // Helper to check constraints for a specific date point
            // Min Date
            if (field.minDate) {
                const min = field.minDate === 'today' ? new Date() : new Date(field.minDate);
                // Reset time for fair date-only comparison if needed, but standard Date comparison includes time.
                // Usually "minDate" implies "at or after", often day-based.
                // Let's assume strict comparison for now.
                if (d < min) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `Date must be on or after ${min.toLocaleDateString()}`,
                    });
                }
            }

            // Max Date
            if (field.maxDate) {
                const max = field.maxDate === 'today' ? new Date() : new Date(field.maxDate);
                if (d > max) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `Date must be on or before ${max.toLocaleDateString()}`,
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
                    const isBad = field.disabled.dates.some(bad =>
                        bad.getDate() === d.getDate() &&
                        bad.getMonth() === d.getMonth() &&
                        bad.getFullYear() === d.getFullYear()
                    );
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
