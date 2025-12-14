"use client"

import * as React from "react"
import {
    DateField as DateFieldPrimitive,
    DateInput as DateInputPrimitive,
    DateSegment,
    type DateFieldProps as DateFieldPrimitiveProps,
    type DateValue,
} from "react-aria-components"

import { cn } from "@/lib/utils"

// Shared style for date inputs
export const dateInputStyle = "border-input bg-sidebar ring-offset-background placeholder:text-muted-foreground focus-within:ring-ring flex h-9 w-full items-center rounded-md border px-3 py-1 text-sm transition-colors focus-within:outline-none focus-within:ring-1 disabled:cursor-not-allowed disabled:opacity-50"

const DateField = React.forwardRef<
    React.ElementRef<typeof DateFieldPrimitive>,
    DateFieldPrimitiveProps<DateValue>
>(({ className, ...props }, ref) => {
    return (
        <DateFieldPrimitive
            ref={ref}
            className={cn("flex flex-col gap-2", className)}
            {...props}
        />
    )
})
DateField.displayName = "DateField"

const DateInput = React.forwardRef<
    React.ElementRef<typeof DateInputPrimitive>,
    Omit<React.ComponentPropsWithoutRef<typeof DateInputPrimitive>, 'children'> & {
        children?: React.ComponentPropsWithoutRef<typeof DateInputPrimitive>['children']
        unstyled?: boolean
    }
>(({ className, children, unstyled, ...props }, ref) => {
    return (
        <DateInputPrimitive
            ref={ref}
            className={cn(
                !unstyled && dateInputStyle,
                className
            )}
            {...props}
        >
            {children || ((segment) => (
                <DateSegment
                    segment={segment}
                    className={cn(
                        "focus:bg-accent focus:text-accent-foreground inline rounded p-0.5 outline-none",
                        segment.isPlaceholder && "text-muted-foreground"
                    )}
                />
            ))}
        </DateInputPrimitive>
    )
})
DateInput.displayName = "DateInput"

export { DateField, DateInput }
