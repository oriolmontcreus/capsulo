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
              {field.options.map(opt => {
                const hasOptPrefix = !!opt.prefix;
                const hasOptSuffix = !!opt.suffix;
                const hasOptAddon = hasOptPrefix || hasOptSuffix;

                return (
                  <SelectItem key={opt.value} value={opt.value}>
                    {hasOptAddon ? (
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
                    ) : (
                      opt.label
                    )}
                  </SelectItem>
                );
              })}
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
            {field.options.map(opt => {
              const hasOptPrefix = !!opt.prefix;
              const hasOptSuffix = !!opt.suffix;
              const hasOptAddon = hasOptPrefix || hasOptSuffix;

              return (
                <SelectItem key={opt.value} value={opt.value}>
                  {hasOptAddon ? (
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
                  ) : (
                    opt.label
                  )}
                </SelectItem>
              );
            })}
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
