import { type ReactNode, useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { type DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { addMonths, subMonths } from 'date-fns';
import config from '@/capsulo.config';
import { getDateFnsLocale } from './datefield.utils';

// Minimal mock for Drawer components
const Drawer = ({ children, open, onOpenChange }: { children: ReactNode; open: boolean; onOpenChange: (open: boolean) => void }) => {
  return <div data-open={open} onClick={() => onOpenChange(!open)}>{children}</div>;
};
const DrawerTrigger = ({ children, asChild }: { children: ReactNode, asChild?: boolean }) => {
  if (asChild) return <>{children}</>;
  return <button>{children}</button>;
};
const DrawerContent = ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>;
const DrawerTitle = ({ children }: { children: ReactNode }) => <h2>{children}</h2>;


const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

    setMatches(mediaQueryList.matches);
    mediaQueryList.addEventListener('change', listener);

    return () => {
      mediaQueryList.removeEventListener('change', listener);
    };
  }, [query]);

  return matches;
};


export type RangeCalendarPickerProps = {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  trigger?: ReactNode;
  classNameContainerTrigger?: string;
  className?: string;
  disabled?: boolean;
  locale?: string;
  fromYear?: number;
  toYear?: number;
};

export const RangeCalendarPicker = ({
  value,
  onChange,
  trigger,
  classNameContainerTrigger,
  className,
  disabled,
  locale,
  fromYear,
  toYear,
}: RangeCalendarPickerProps) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = useState(false);
  const [tempValue, setTempValue] = useState<DateRange | undefined>(value);
  const [leftMonth, setLeftMonth] = useState<Date>(new Date());
  const [rightMonth, setRightMonth] = useState<Date>(addMonths(new Date(), 1)); // Initialize right month to be 1 month ahead

  useEffect(() => {
    if (open) {
      setTempValue(value);
      if (value?.from) {
        setLeftMonth(value.from);
        setRightMonth(addMonths(value.from, 1)); // Ensure right month is always 1 month ahead of selected start date
      } else {
        setLeftMonth(new Date());
        setRightMonth(addMonths(new Date(), 1));
      }
    }
  }, [open, value]);

  const handleSelect = (range: DateRange | undefined) => {
    setTempValue(range);
  };

  const handleConfirm = () => {
    onChange?.(tempValue);
    setOpen(false);
  };

  // When left month changes, ensure right month is always one month ahead
  const handleLeftMonthChange = (month: Date) => {
    setLeftMonth(month);
    setRightMonth(addMonths(month, 1));
  };

  // When right month changes, ensure left month is always one month behind
  const handleRightMonthChange = (month: Date) => {
    setRightMonth(month);
    setLeftMonth(subMonths(month, 1));
  };

  if (!isMounted) {
    return (
      <div className={className}>
        <div
          className={cn(
            classNameContainerTrigger,
            disabled && 'pointer-events-none opacity-50'
          )}
        >
          {trigger}
        </div>
      </div>
    );
  }

  if (!isDesktop) {
    return (
      <div className={className}>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <div
              className={cn(
                classNameContainerTrigger,
                disabled && 'pointer-events-none opacity-50'
              )}
              onClick={() => !disabled && setOpen(true)}
            >
              {trigger}
            </div>
          </DrawerTrigger>

          <DrawerContent aria-describedby={undefined} className="gap-4 px-4 pb-4">
            {/* <VisuallyHidden>
              <DrawerTitle>Select Date Range</DrawerTitle>
            </VisuallyHidden> */}

            <Calendar
              key={value?.from?.toDateString() || 'empty'}
              mode="range"
              className="w-full p-0 flex justify-center"
              selected={tempValue}
              month={leftMonth}
              onMonthChange={handleLeftMonthChange}
              onSelect={handleSelect}
              autoFocus
              locale={getDateFnsLocale(locale || config.i18n?.defaultLocale)}
              captionLayout="dropdown"
              fixedWeeks
              fromYear={fromYear || 2000}
              toYear={toYear || new Date().getFullYear() + 100}
            />
            <Button onClick={handleConfirm} className="w-full">
              Confirm
            </Button>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={(val: boolean) => !disabled && setOpen(val)}>
        <PopoverTrigger asChild>
          <div
            className={cn(classNameContainerTrigger, disabled && 'pointer-events-none opacity-50')}
          >
            {trigger}
          </div>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0 mr-2" align="start">
          <div className="rounded-md">
            <div className="flex">
              {/* Calendars - Two separate calendars for independent year/month navigation */}
              <div className="flex gap-4">
                <Calendar
                  key={`left-${value?.from?.toDateString() || 'empty'}`}
                  mode="range"
                  selected={tempValue}
                  month={leftMonth}
                  onMonthChange={handleLeftMonthChange}
                  onSelect={handleSelect}
                  autoFocus
                  locale={getDateFnsLocale(locale || config.i18n?.defaultLocale)}
                  captionLayout="dropdown"
                  numberOfMonths={1}
                  fixedWeeks
                  fromYear={fromYear || 2000}
                  toYear={toYear || new Date().getFullYear() + 100}
                />
                <Calendar
                  key={`right-${value?.to?.toDateString() || 'empty'}`}
                  mode="range"
                  selected={tempValue}
                  month={rightMonth}
                  onMonthChange={handleRightMonthChange}
                  onSelect={handleSelect}
                  locale={getDateFnsLocale(locale || config.i18n?.defaultLocale)}
                  captionLayout="dropdown"
                  numberOfMonths={1}
                  fixedWeeks
                  fromYear={fromYear || 2000}
                  toYear={toYear || new Date().getFullYear() + 100}
                />
              </div>
            </div>
          </div>
          <div className="p-3 border-t border-border flex justify-end">
            <Button onClick={handleConfirm} size="sm" className="h-7.5 rounded-lg">
              Confirm
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
