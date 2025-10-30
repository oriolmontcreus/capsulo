import React from 'react';
import type { SelectField as SelectFieldType } from './select.types';
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
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
import { Check, ChevronsUpDown, X } from 'lucide-react';
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
  const triggerRef = React.useRef<HTMLDivElement>(null);

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

  // Get selected option label
  const getSelectedLabel = () => {
    const selected = field.options.find((opt) => opt.value === value);
    return selected?.label || field.placeholder || 'Select an option';
  };

  // Render searchable combobox
  if (field.searchable) {
    const selectedOption = field.options.find((opt) => opt.value === value);

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
            <Popover open={open} onOpenChange={setOpen}>
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
                  />
                  <CommandList>
                    <CommandEmpty>
                      {field.emptyMessage || "No results found."}
                    </CommandEmpty>
                    <CommandGroup>
                      {field.options.map((opt) => (
                        <CommandItem
                          key={opt.value}
                          value={opt.label}
                          disabled={opt.disabled}
                          onSelect={() => {
                            onChange(value === opt.value ? '' : opt.value);
                            setOpen(false);
                          }}
                        >
                          {renderOptionContent(opt)}
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              value === opt.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
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
          <Popover open={open} onOpenChange={setOpen}>
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
                />
                <CommandList>
                  <CommandEmpty>
                    {field.emptyMessage || "No results found."}
                  </CommandEmpty>
                  <CommandGroup>
                    {field.options.map((opt) => (
                      <CommandItem
                        key={opt.value}
                        value={opt.label}
                        disabled={opt.disabled}
                        onSelect={() => {
                          onChange(value === opt.value ? '' : opt.value);
                          setOpen(false);
                        }}
                      >
                        {renderOptionContent(opt)}
                        <Check
                          className={cn(
                            "ml-auto h-4 w-4",
                            value === opt.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
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
              {field.options.map(opt => (
                <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {renderOptionContent(opt)}
                </SelectItem>
              ))}
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
            {field.options.map(opt => (
              <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                {renderOptionContent(opt)}
              </SelectItem>
            ))}
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
