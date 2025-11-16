"use client"

import * as React from "react"
import {
    Calendar as CalendarPrimitive,
    CalendarCell,
    CalendarGrid,
    CalendarGridBody,
    CalendarGridHeader,
    CalendarHeaderCell,
    Heading,
    type CalendarProps,
    type DateValue,
    RangeCalendar as RangeCalendarPrimitive,
    type RangeCalendarProps,
} from "react-aria-components"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const Calendar = React.forwardRef<
    React.ElementRef<typeof CalendarPrimitive>,
    CalendarProps<DateValue>
>(({ className, ...props }, ref) => {
    return (
        <CalendarPrimitive
            ref={ref}
            className={cn("w-fit", className)}
            {...props}
        >
            <CalendarHeader />
            <CalendarGrid className="border-collapse space-y-1">
                <CalendarGridHeader>
                    {(day) => (
                        <CalendarHeaderCell className="text-muted-foreground w-9 rounded-md text-[0.8rem] font-normal">
                            {day}
                        </CalendarHeaderCell>
                    )}
                </CalendarGridHeader>
                <CalendarGridBody>
                    {(date) => (
                        <CalendarCell
                            date={date}
                            className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-md p-0 text-sm outline-none ring-offset-background transition-colors data-disabled:pointer-events-none data-outside-month:text-muted-foreground data-selected:bg-primary data-selected:text-primary-foreground data-selected:opacity-100 data-disabled:opacity-30 data-unavailable:line-through data-focus-visible:ring-2 data-focus-visible:ring-ring data-hovered:bg-accent data-hovered:text-accent-foreground [&[data-selection-start]]:rounded-s-md [&[data-selection-end]]:rounded-e-md"
                        />
                    )}
                </CalendarGridBody>
            </CalendarGrid>
        </CalendarPrimitive>
    )
})
Calendar.displayName = "Calendar"

const RangeCalendar = React.forwardRef<
    React.ElementRef<typeof RangeCalendarPrimitive>,
    RangeCalendarProps<DateValue>
>(({ className, ...props }, ref) => {
    return (
        <RangeCalendarPrimitive
            ref={ref}
            className={cn("w-fit", className)}
            {...props}
        >
            <CalendarHeader />
            <CalendarGrid className="border-collapse space-y-1">
                <CalendarGridHeader>
                    {(day) => (
                        <CalendarHeaderCell className="text-muted-foreground w-9 rounded-md text-[0.8rem] font-normal">
                            {day}
                        </CalendarHeaderCell>
                    )}
                </CalendarGridHeader>
                <CalendarGridBody>
                    {(date) => (
                        <CalendarCell
                            date={date}
                            className="relative flex h-9 w-9 cursor-pointer items-center justify-center p-0 text-sm outline-none ring-offset-background transition-colors data-disabled:pointer-events-none data-outside-month:text-muted-foreground data-selected:bg-primary data-selected:text-primary-foreground data-disabled:opacity-30 data-unavailable:line-through data-focus-visible:ring-2 data-focus-visible:ring-ring data-hovered:bg-accent data-hovered:text-accent-foreground [&[data-selection-start]]:rounded-s-md [&[data-selection-end]]:rounded-e-md"
                        />
                    )}
                </CalendarGridBody>
            </CalendarGrid>
        </RangeCalendarPrimitive>
    )
})
RangeCalendar.displayName = "RangeCalendar"

function CalendarHeader() {
    return (
        <header className="flex w-full items-center gap-1 pb-4">
            <Button
                slot="previous"
                variant="outline"
                className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
            >
                <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Heading className="flex-1 text-center text-sm font-medium" />
            <Button
                slot="next"
                variant="outline"
                className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
            >
                <ChevronRightIcon className="h-4 w-4" />
            </Button>
        </header>
    )
}

export { Calendar, RangeCalendar }
