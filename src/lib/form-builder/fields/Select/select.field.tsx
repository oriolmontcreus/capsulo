import React from 'react';
import type { SelectField as SelectFieldType, SelectOption, ResponsiveColumns } from './select.types';
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectFieldProps {
  field: SelectFieldType;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

export const SelectField: React.FC<SelectFieldProps> = React.memo(({ field, value, onChange, error }) => {
  const hasPrefix = !!field.prefix;
  const hasSuffix = !!field.suffix;
  const hasAddon = hasPrefix || hasSuffix;
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState('');
  const triggerRef = React.useRef<HTMLDivElement>(null);

  // Debounce search for better performance with large datasets
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, field.minSearchLength && searchQuery.length < field.minSearchLength ? 0 : 150);

    return () => clearTimeout(timer);
  }, [searchQuery, field.minSearchLength]);

  // Helper to check if columns are configured (either number > 1 or responsive object)
  const hasMultipleColumns = () => {
    if (!field.columns) return false;
    if (typeof field.columns === 'number') return field.columns > 1;
    // For responsive, return true if it's an object (we'll handle the logic in CSS)
    return typeof field.columns === 'object';
  };

  // Generate unique ID for responsive styles
  const selectId = React.useId();

  // Generate responsive CSS for columns
  const generateResponsiveStyles = () => {
    if (!field.columns || typeof field.columns === 'number') return '';

    const responsive = field.columns as ResponsiveColumns;
    let css = '';

    // Always set base grid properties first
    css += `
      [data-select-id="${selectId}"] {
        display: grid !important;
        gap: 0.25rem !important;
        padding: 0.25rem !important;
        width: 100% !important;
      }
    `;

    // Base (mobile-first) - default to 1 column if not specified
    const baseCols = responsive.base || 1;
    css += `
      [data-select-id="${selectId}"] {
        grid-template-columns: repeat(${baseCols}, 1fr) !important;
      }
    `;

    // Responsive breakpoints
    if (responsive.sm !== undefined) {
      css += `
        @media (min-width: 640px) {
          [data-select-id="${selectId}"] {
            grid-template-columns: repeat(${responsive.sm}, 1fr) !important;
          }
        }
      `;
    }
    if (responsive.md !== undefined) {
      css += `
        @media (min-width: 768px) {
          [data-select-id="${selectId}"] {
            grid-template-columns: repeat(${responsive.md}, 1fr) !important;
          }
        }
      `;
    }
    if (responsive.lg !== undefined) {
      css += `
        @media (min-width: 1024px) {
          [data-select-id="${selectId}"] {
            grid-template-columns: repeat(${responsive.lg}, 1fr) !important;
          }
        }
      `;
    }
    if (responsive.xl !== undefined) {
      css += `
        @media (min-width: 1280px) {
          [data-select-id="${selectId}"] {
            grid-template-columns: repeat(${responsive.xl}, 1fr) !important;
          }
        }
      `;
    }

    return css;
  };

  // Get base grid styles for simple number columns
  const getBaseGridStyles = () => {
    if (!hasMultipleColumns()) return {};

    if (typeof field.columns === 'number') {
      return {
        display: 'grid',
        gridTemplateColumns: `repeat(${field.columns}, 1fr)`,
        gap: '0.25rem',
        padding: '0.25rem',
        width: '100%'
      };
    }

    // For responsive, don't return inline styles - let CSS handle it
    return {};
  };

  // Helper to render option content with prefix/suffix
  const renderOptionContent = (opt: any) => {
    const hasOptPrefix = !!opt.prefix;
    const hasOptSuffix = !!opt.suffix;
    const hasOptAddon = hasOptPrefix || hasOptSuffix;

    if (!hasOptAddon) return opt.label;

    return (
      <div className="flex items-center gap-2 w-full">
        {hasOptPrefix && (
          <span className="flex shrink-0 items-center">
            {opt.prefix}
          </span>
        )}
        <span className="flex-1">{opt.label}</span>
        {hasOptSuffix && (
          <span className="flex shrink-0 items-center">
            {opt.suffix}
          </span>
        )}
      </div>
    );
  };

  // Helper to get all options (from both individual options and groups)
  const getAllOptions = () => {
    if (field.groups && field.groups.length > 0) {
      return field.groups.flatMap(group => group.options);
    }
    return field.options;
  };

  // Helper to check if using groups
  const hasGroups = () => {
    return field.groups && field.groups.length > 0;
  };

  // Advanced filtering helpers
  const searchInOption = (option: SelectOption, query: string): boolean => {
    if (!query) return true;
    return option.label.toLowerCase().includes(query.toLowerCase());
  };

  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!field.highlightMatches || !query) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, index) => {
          if (!part) return null; // Skip empty parts
          return regex.test(part) ? (
            <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5 py-0">
              {part}
            </mark>
          ) : (
            part
          );
        })}
      </>
    );
  };

  // Virtualization helpers
  const shouldVirtualize = () => {
    if (field.virtualized === false) return false;
    if (field.virtualized === true) return true;

    // Default to virtualization at 50+ items for better performance
    const threshold = field.virtualizeThreshold || 50;
    const totalOptions = getAllOptions().length;
    return totalOptions >= threshold;
  };

  const getItemHeight = () => field.itemHeight || 40;
  const getMaxVisible = () => field.maxVisible || 8;

  // Virtual scrolling state for true virtualization
  const [scrollTop, setScrollTop] = React.useState(0);
  const [visibleStartIndex, setVisibleStartIndex] = React.useState(0);
  const [visibleEndIndex, setVisibleEndIndex] = React.useState(0);

  // Calculate visible items for true virtualization
  const calculateVisibleRange = React.useCallback((allItems: SelectOption[]) => {
    if (!shouldVirtualize()) {
      return { start: 0, end: allItems.length, items: allItems };
    }

    const itemHeight = getItemHeight();
    const maxVisible = getMaxVisible();
    const containerHeight = maxVisible * itemHeight;

    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2; // +2 buffer
    const end = Math.min(start + visibleCount, allItems.length);

    return {
      start: Math.max(0, start),
      end,
      items: allItems.slice(Math.max(0, start), end)
    };
  }, [scrollTop, shouldVirtualize, getItemHeight, getMaxVisible]);

  // Handle virtual scroll
  const handleVirtualScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);

    const allItems = getAllOptions();
    const { start, end } = calculateVisibleRange(allItems);
    setVisibleStartIndex(start);
    setVisibleEndIndex(end);
  }, [calculateVisibleRange, getAllOptions]);

  // Memoize expensive calculations
  const allOptions = React.useMemo(() => getAllOptions(), [field.options, field.groups]);
  const isVirtualized = React.useMemo(() => shouldVirtualize(), [allOptions.length, field.virtualized, field.virtualizeThreshold]);





  // Helper to render command items (for searchable select)
  const renderCommandItems = () => {
    // Get all options and filter by search (use debounced query for performance)
    const allOptions = getAllOptions();
    const queryToUse = field.minSearchLength && debouncedSearchQuery.length < field.minSearchLength ? '' : debouncedSearchQuery;
    const filteredOptions = allOptions.filter(opt => searchInOption(opt, queryToUse));

    // If not virtualizing, render all filtered options normally
    if (!shouldVirtualize()) {
      return filteredOptions.map((opt) => renderSingleCommandItem(opt));
    }

    // True virtualization: only render visible items
    const { start, end, items: visibleItems } = calculateVisibleRange(filteredOptions);
    const itemHeight = getItemHeight();
    const totalHeight = filteredOptions.length * itemHeight;
    const offsetY = start * itemHeight;

    return (
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((opt, index) => renderSingleCommandItem(opt, start + index))}
        </div>
      </div>
    );
  };

  // Helper to render a single command item
  const renderSingleCommandItem = (opt: SelectOption, virtualIndex?: number) => {
    const queryToUse = field.minSearchLength && debouncedSearchQuery.length < field.minSearchLength ? '' : debouncedSearchQuery;
    const optionContent = field.highlightMatches ? {
      ...opt,
      label: highlightText(opt.label, queryToUse)
    } : opt;

    return (
      <CommandItem
        key={`${opt.value}-${virtualIndex || 0}`}
        value={opt.label}
        disabled={opt.disabled}
        onSelect={() => {
          onChange(value === opt.value ? '' : opt.value);
          setOpen(false);
        }}
        className={cn(
          hasMultipleColumns() ? "justify-between" : "",
          shouldVirtualize() && "min-h-[40px] flex items-center"
        )}
        style={shouldVirtualize() ? { height: getItemHeight() } : undefined}
      >
        {hasMultipleColumns() ? (
          <>
            <span className="truncate">{renderOptionContent(optionContent)}</span>
            <Check
              className={cn(
                "h-4 w-4 shrink-0",
                value === opt.value ? "opacity-100" : "opacity-0"
              )}
            />
          </>
        ) : (
          <>
            {renderOptionContent(optionContent)}
            <Check
              className={cn(
                "ml-auto h-4 w-4",
                value === opt.value ? "opacity-100" : "opacity-0"
              )}
            />
          </>
        )}
      </CommandItem>
    );
  };

  // Helper to render select items (for regular select)
  const renderSelectItems = () => {
    if (hasGroups()) {
      return field.groups!.map((group) => (
        <SelectGroup key={group.label}>
          <SelectLabel>{group.label}</SelectLabel>
          {group.options.map(opt => (
            <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
              {renderOptionContent(opt)}
            </SelectItem>
          ))}
        </SelectGroup>
      ));
    } else {
      return field.options.map(opt => (
        <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
          {renderOptionContent(opt)}
        </SelectItem>
      ));
    }
  };

  // Render searchable combobox
  if (field.searchable) {
    const selectedOption = getAllOptions().find((opt) => opt.value === value);

    const comboboxButton = (
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        aria-invalid={!!error}
        className={cn(
          "w-full justify-between font-normal h-9",
          !value && "text-muted-foreground",
          error && "border-destructive",
          hasAddon ? "!border-0 !bg-transparent !shadow-none hover:!bg-transparent focus-visible:!ring-0 focus-visible:!ring-offset-0 !px-0 data-[state=open]:!bg-transparent" : "bg-sidebar dark:hover:bg-input/50"
        )}
      >
        <span className="flex items-center gap-2 flex-1 overflow-hidden">
          {selectedOption?.prefix && (
            <span className="flex shrink-0 items-center">
              {selectedOption.prefix}
            </span>
          )}
          <span className="truncate">
            {value ? selectedOption?.label : field.placeholder || 'Select an option'}
          </span>
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </div>
      </Button>
    );

    return (
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor={field.name} required={field.required}>
          {field.label || field.name}
        </FieldLabel>
        {hasAddon ? (
          <div
            ref={triggerRef}
            className={cn(
              "border-input bg-sidebar focus-within:border-ring focus-within:ring-ring/50 flex h-9 w-full items-center gap-2 rounded-md border px-3 shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]",
              error && "border-destructive"
            )}
          >
            {hasPrefix && (
              <div className="text-muted-foreground flex shrink-0 items-center text-sm">
                {field.prefix}
              </div>
            )}
            <Popover open={open} onOpenChange={(newOpen) => {
              setOpen(newOpen);
              if (!newOpen) setSearchQuery('');
            }}>
              <PopoverTrigger asChild>
                <div className="flex-1 min-w-0">{comboboxButton}</div>
              </PopoverTrigger>
              <PopoverContent
                className="p-0"
                align="start"
                style={{ width: triggerRef.current?.offsetWidth }}
              >
                <Command>
                  <CommandInput
                    placeholder={field.searchPlaceholder || "Search..."}
                    className="h-9"
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList
                    onScroll={shouldVirtualize() ? handleVirtualScroll : undefined}
                    style={shouldVirtualize() ? {
                      maxHeight: `${getMaxVisible() * getItemHeight()}px`,
                      overflowY: 'auto'
                    } : undefined}
                  >
                    <CommandEmpty>
                      {field.emptyMessage || "No results found."}
                    </CommandEmpty>
                    {hasGroups() ? (
                      // For groups, don't wrap in CommandGroup since renderCommandItems creates them
                      <>
                        {/* Inject responsive styles if needed */}
                        {typeof field.columns === 'object' && (
                          <style dangerouslySetInnerHTML={{ __html: generateResponsiveStyles() }} />
                        )}
                        {hasMultipleColumns() ? (
                          <div
                            data-select-id={selectId}
                            style={getBaseGridStyles()}
                            className="select-grid-container"
                          >
                            {renderCommandItems()}
                          </div>
                        ) : (
                          renderCommandItems()
                        )}
                      </>
                    ) : (
                      <CommandGroup>
                        {hasMultipleColumns() ? (
                          <>
                            {/* Inject responsive styles if needed */}
                            {typeof field.columns === 'object' && (
                              <style dangerouslySetInnerHTML={{ __html: generateResponsiveStyles() }} />
                            )}
                            <div
                              data-select-id={selectId}
                              style={getBaseGridStyles()}
                              className="select-grid-container"
                            >
                              {renderCommandItems()}
                            </div>
                          </>
                        ) : (
                          renderCommandItems()
                        )}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {hasSuffix && (
              <div className="text-muted-foreground flex shrink-0 items-center text-sm">
                {field.suffix}
              </div>
            )}
          </div>
        ) : (
          <Popover open={open} onOpenChange={(newOpen) => {
            setOpen(newOpen);
            if (!newOpen) setSearchQuery('');
          }}>
            <PopoverTrigger asChild>
              <div ref={triggerRef}>{comboboxButton}</div>
            </PopoverTrigger>
            <PopoverContent
              className="p-0"
              align="start"
              style={{ width: triggerRef.current?.offsetWidth }}
            >
              <Command>
                <CommandInput
                  placeholder={field.searchPlaceholder || "Search..."}
                  className="h-9"
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList
                  onScroll={shouldVirtualize() ? handleVirtualScroll : undefined}
                  style={shouldVirtualize() ? {
                    maxHeight: `${getMaxVisible() * getItemHeight()}px`,
                    overflowY: 'auto'
                  } : undefined}
                >
                  <CommandEmpty>
                    {field.emptyMessage || "No results found."}
                  </CommandEmpty>
                  {hasGroups() ? (
                    // For groups, don't wrap in CommandGroup since renderCommandItems creates them
                    <>
                      {/* Inject responsive styles if needed */}
                      {typeof field.columns === 'object' && (
                        <style dangerouslySetInnerHTML={{ __html: generateResponsiveStyles() }} />
                      )}
                      {hasMultipleColumns() ? (
                        <div
                          data-select-id={selectId}
                          style={getBaseGridStyles()}
                          className="select-grid-container"
                        >
                          {renderCommandItems()}
                        </div>
                      ) : (
                        renderCommandItems()
                      )}
                    </>
                  ) : (
                    <CommandGroup>
                      {hasMultipleColumns() ? (
                        <>
                          {/* Inject responsive styles if needed */}
                          {typeof field.columns === 'object' && (
                            <style dangerouslySetInnerHTML={{ __html: generateResponsiveStyles() }} />
                          )}
                          <div
                            data-select-id={selectId}
                            style={getBaseGridStyles()}
                            className="select-grid-container"
                          >
                            {renderCommandItems()}
                          </div>
                        </>
                      ) : (
                        renderCommandItems()
                      )}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
        {error ? (
          <FieldError>{error}</FieldError>
        ) : field.description ? (
          <FieldDescription>{field.description}</FieldDescription>
        ) : null}
      </Field>
    );
  }

  // Render regular select
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={field.name} required={field.required}>
        {field.label || field.name}
      </FieldLabel>
      {hasAddon ? (
        <div
          className={cn(
            "border-input bg-sidebar focus-within:border-ring focus-within:ring-ring/50 flex h-9 w-full items-center gap-2 rounded-md border px-3 shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]",
            error && "border-destructive"
          )}
          aria-invalid={!!error}
        >
          {hasPrefix && (
            <div className="text-muted-foreground flex shrink-0 items-center text-sm">
              {field.prefix}
            </div>
          )}
          <Select value={value || ''} onValueChange={onChange} required={field.required}>
            <SelectTrigger
              id={field.name}
              aria-invalid={!!error}
              className="border-0 bg-transparent rounded-none shadow-none focus:ring-0 focus:ring-offset-0 h-auto px-0 py-0 flex-1 w-full"
            >
              <SelectValue placeholder={field.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {hasMultipleColumns() ? (
                <>
                  {/* Inject responsive styles if needed */}
                  {typeof field.columns === 'object' && (
                    <style dangerouslySetInnerHTML={{ __html: generateResponsiveStyles() }} />
                  )}
                  <div
                    data-select-id={selectId}
                    style={getBaseGridStyles()}
                    className="select-grid-container"
                  >
                    {renderSelectItems()}
                  </div>
                </>
              ) : (
                renderSelectItems()
              )}
            </SelectContent>
          </Select>
          {hasSuffix && (
            <div className="text-muted-foreground flex shrink-0 items-center text-sm">
              {field.suffix}
            </div>
          )}
        </div>
      ) : (
        <Select value={value || ''} onValueChange={onChange} required={field.required}>
          <SelectTrigger
            id={field.name}
            aria-invalid={!!error}
            className={cn(error && "border-destructive")}
          >
            <SelectValue placeholder={field.placeholder || 'Select an option'} />
          </SelectTrigger>
          <SelectContent>
            {hasMultipleColumns() ? (
              <>
                {/* Inject responsive styles if needed */}
                {typeof field.columns === 'object' && (
                  <style dangerouslySetInnerHTML={{ __html: generateResponsiveStyles() }} />
                )}
                <div
                  data-select-id={selectId}
                  style={getBaseGridStyles()}
                  className="select-grid-container"
                >
                  {renderSelectItems()}
                </div>
              </>
            ) : (
              renderSelectItems()
            )}
          </SelectContent>
        </Select>
      )}
      {/* Error message (takes priority over description) */}
      {error ? (
        <FieldError>{error}</FieldError>
      ) : field.description ? (
        <FieldDescription>{field.description}</FieldDescription>
      ) : null}
    </Field>
  );
}, (prevProps, nextProps) => {
  return prevProps.value === nextProps.value && prevProps.error === nextProps.error;
});
