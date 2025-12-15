import React from 'react';
import type { SelectField as SelectFieldType } from './select.types';
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import modular utilities
import {
  useSearchLogic,
  useVirtualization,
  useResponsiveStyles,
  useRendering
} from './modules';

interface SelectFieldProps {
  field: SelectFieldType;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  formData?: any;
}

export const SelectField: React.FC<SelectFieldProps> = React.memo(({ field, value, onChange, error, formData }) => {
  const hasPrefix = !!field.prefix;
  const hasSuffix = !!field.suffix;
  const hasAddon = hasPrefix || hasSuffix;
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLDivElement>(null);

  // Use modular hooks
  const { searchQuery, setSearchQuery, debouncedSearchQuery, searchInOption } = useSearchLogic(field);
  const { selectId, hasMultipleColumns, generateResponsiveStyles, getBaseGridStyles } = useResponsiveStyles(field);

  const isRequired = React.useMemo(() => {
    if (typeof field.required === 'function') {
      return field.required(formData ?? {});
    }
    return !!field.required;
  }, [field.required, formData]);

  // Create a temporary rendering object to get getAllOptions
  const tempRendering = useRendering({
    field,
    value,
    onChange,
    setOpen,
    debouncedSearchQuery,
    hasMultipleColumns,
    shouldVirtualize: () => false,
    getItemHeight: () => 40,
    calculateVisibleRange: () => ({ start: 0, end: 0, items: [] }),
    selectId,
    getBaseGridStyles
  });

  const virtualization = useVirtualization(field, tempRendering.getAllOptions);

  // Now create the final rendering with proper virtualization
  const rendering = useRendering({
    field,
    value,
    onChange,
    setOpen,
    debouncedSearchQuery,
    hasMultipleColumns,
    shouldVirtualize: virtualization.shouldVirtualize,
    getItemHeight: virtualization.getItemHeight,
    calculateVisibleRange: virtualization.calculateVisibleRange,
    selectId,
    getBaseGridStyles
  });

  // Find selected option for display
  const selectedOption = rendering.getAllOptions().find((opt) => opt.value === value);

  // Render searchable combobox
  if (field.searchable) {
    const comboboxButton = (
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        aria-invalid={!!error}
        className={cn(
          "w-full justify-between font-normal h-9 !border-border/60 !bg-sidebar hover:!bg-sidebar",
          !value && "text-muted-foreground",
          hasAddon ? "!shadow-none focus-visible:!ring-0 focus-visible:!ring-offset-0 !px-0" : "bg-sidebar"
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
        <FieldLabel htmlFor={field.name} required={isRequired}>
          {field.label || field.name}
        </FieldLabel>
        {hasAddon ? (
          <div
            ref={triggerRef}
            className={cn(
              "border-border/60 bg-sidebar focus-within:border-ring focus-within:ring-ring/50 flex h-9 w-full items-center gap-2 rounded-md border px-3 shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]",
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
                    onScroll={virtualization.shouldVirtualize() ? virtualization.handleVirtualScroll : undefined}
                    style={virtualization.shouldVirtualize() ? {
                      maxHeight: `${virtualization.getMaxVisible() * virtualization.getItemHeight()}px`,
                      overflowY: 'auto'
                    } : undefined}
                  >
                    <CommandEmpty>
                      {field.emptyMessage || "No results found."}
                    </CommandEmpty>
                    {rendering.hasGroups() ? (
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
                            {rendering.renderCommandItems(searchInOption)}
                          </div>
                        ) : (
                          rendering.renderCommandItems(searchInOption)
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
                              {rendering.renderCommandItems(searchInOption)}
                            </div>
                          </>
                        ) : (
                          rendering.renderCommandItems(searchInOption)
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
                  onScroll={virtualization.shouldVirtualize() ? virtualization.handleVirtualScroll : undefined}
                  style={virtualization.shouldVirtualize() ? {
                    maxHeight: `${virtualization.getMaxVisible() * virtualization.getItemHeight()}px`,
                    overflowY: 'auto'
                  } : undefined}
                >
                  <CommandEmpty>
                    {field.emptyMessage || "No results found."}
                  </CommandEmpty>
                  {rendering.hasGroups() ? (
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
                          {rendering.renderCommandItems(searchInOption)}
                        </div>
                      ) : (
                        rendering.renderCommandItems(searchInOption)
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
                            {rendering.renderCommandItems(searchInOption)}
                          </div>
                        </>
                      ) : (
                        rendering.renderCommandItems(searchInOption)
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
      <FieldLabel htmlFor={field.name} required={isRequired}>
        {field.label || field.name}
      </FieldLabel>
      {hasAddon ? (
        <div
          className={cn(
            "border-border/60 bg-sidebar focus-within:border-ring focus-within:ring-ring/50 flex h-9 w-full items-center gap-2 rounded-md border px-3 shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]",
            error && "border-destructive"
          )}
          aria-invalid={!!error}
        >
          {hasPrefix && (
            <div className="text-muted-foreground flex shrink-0 items-center text-sm">
              {field.prefix}
            </div>
          )}
          <Select value={value || ''} onValueChange={onChange} required={isRequired}>
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
                    {rendering.renderSelectItems()}
                  </div>
                </>
              ) : (
                rendering.renderSelectItems()
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
        <Select value={value || ''} onValueChange={onChange} required={isRequired}>
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
                  {rendering.renderSelectItems()}
                </div>
              </>
            ) : (
              rendering.renderSelectItems()
            )}
          </SelectContent>
        </Select>
      )}
      {error ? (
        <FieldError>{error}</FieldError>
      ) : field.description ? (
        <FieldDescription>{field.description}</FieldDescription>
      ) : null}
    </Field>
  );
}, (prevProps, nextProps) => {
  return prevProps.value === nextProps.value && prevProps.error === nextProps.error && prevProps.formData === nextProps.formData;
});