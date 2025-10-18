import React from 'react';
import type { InputField as InputFieldType } from './input.types';
import { Input as InputUI } from '@/components/ui/input';
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';
import { cn } from '@/lib/utils';

interface InputFieldProps {
  field: InputFieldType;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

export const InputField: React.FC<InputFieldProps> = ({ field, value, onChange, error }) => {
  const hasPrefix = !!field.prefix;
  const hasSuffix = !!field.suffix;
  const hasAddon = hasPrefix || hasSuffix;
  const isNumber = field.inputType === 'number';
  const textValue = value || '';

  // Handle number input change - convert to number
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isNumber) {
      const val = e.target.value;
      onChange(val === '' ? '' : Number(val));
    } else {
      onChange(e.target.value);
    }
  };

  // Get the step value
  const getStep = () => {
    if (field.step !== undefined) return field.step;
    if (field.allowDecimals === false) return 1;
    return undefined;
  };

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={field.name} required={field.required}>
        {field.label || field.name}
      </FieldLabel>
      {hasAddon ? (
        <div
          className={cn(
            "border-input bg-sidebar focus-within:border-ring focus-within:ring-ring/50 flex h-9 w-full items-center gap-2 rounded-md border px-3 shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]",
            error && "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border-destructive"
          )}
          aria-invalid={!!error}
        >
          {hasPrefix && (
            <div className="text-muted-foreground flex shrink-0 items-center text-sm">
              {field.prefix}
            </div>
          )}
          <InputUI
            id={field.name}
            type={field.inputType || 'text'}
            value={textValue}
            onChange={handleChange}
            placeholder={field.placeholder}
            required={field.required}
            minLength={!isNumber ? field.minLength : undefined}
            maxLength={!isNumber ? field.maxLength : undefined}
            min={isNumber ? field.min : undefined}
            max={isNumber ? field.max : undefined}
            step={isNumber ? getStep() : undefined}
            aria-invalid={!!error}
            className="border-0 bg-transparent rounded-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 h-auto px-0 py-0"
          />
          {hasSuffix && (
            <div className="text-muted-foreground flex shrink-0 items-center text-sm">
              {field.suffix}
            </div>
          )}
        </div>
      ) : (
        <InputUI
          id={field.name}
          type={field.inputType || 'text'}
          value={textValue}
          onChange={handleChange}
          placeholder={field.placeholder}
          required={field.required}
          minLength={!isNumber ? field.minLength : undefined}
          maxLength={!isNumber ? field.maxLength : undefined}
          min={isNumber ? field.min : undefined}
          max={isNumber ? field.max : undefined}
          step={isNumber ? getStep() : undefined}
          aria-invalid={!!error}
        />
      )}
      {field.maxLength && !isNumber && (
        <div className="text-xs text-muted-foreground text-right">
          {textValue.length} / {field.maxLength}
        </div>
      )}
      {field.description && (
        <FieldDescription>{field.description}</FieldDescription>
      )}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
};


