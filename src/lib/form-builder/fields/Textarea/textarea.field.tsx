import React, { useRef, useEffect } from 'react';
import type { TextareaField as TextareaFieldType } from './textarea.types';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';
import { cn } from '@/lib/utils';

interface TextareaFieldProps {
  field: TextareaFieldType;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

export const TextareaField: React.FC<TextareaFieldProps> = React.memo(({ field, value, onChange, error }) => {
  const textValue = value || '';
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasPrefix = !!field.prefix;
  const hasSuffix = !!field.suffix;
  const hasAddon = hasPrefix || hasSuffix;

  // Auto-resize functionality
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea || !field.autoResize) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';

    const minHeight = field.minRows ? field.minRows * 24 : 0; // ~24px per row
    const maxHeight = field.maxRows ? field.maxRows * 24 : Infinity;

    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  };

  // Adjust height on mount and when value changes
  useEffect(() => {
    adjustHeight();
  }, [textValue, field.autoResize, field.minRows, field.maxRows]);

  // Handle textarea change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    if (field.autoResize) {
      adjustHeight();
    }
  };

  // Get resize style
  const getResizeStyle = () => {
    if (field.autoResize) return 'none'; // Disable manual resize when auto-resize is enabled
    return field.resize || 'vertical'; // Default to vertical if not specified
  };

  const textareaElement = (
    <Textarea
      ref={textareaRef}
      id={field.name}
      value={textValue}
      onChange={handleChange}
      placeholder={field.placeholder}
      required={field.required}
      rows={field.autoResize ? (field.minRows || 1) : (field.rows || 3)}
      minLength={field.minLength}
      maxLength={field.maxLength}
      aria-invalid={!!error}
      className={cn(
        error && "border-destructive",
        hasAddon && "border-0 bg-transparent rounded-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 py-0"
      )}
      style={{ resize: getResizeStyle() }}
    />
  );

  return (
    <Field data-invalid={!!error}>
      <div className="flex justify-between items-center">
        <FieldLabel htmlFor={field.name} required={field.required}>
          {field.label || field.name}
        </FieldLabel>
        {field.maxLength && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {textValue.length} / {field.maxLength}
          </span>
        )}
      </div>
      {hasAddon ? (
        <div
          className={cn(
            "border-input bg-sidebar focus-within:border-ring focus-within:ring-ring/50 relative flex w-full gap-2 rounded-md border px-3 py-2 shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]",
            error && "border-destructive"
          )}
          aria-invalid={!!error}
        >
          {hasPrefix && (
            <div className="text-muted-foreground flex shrink-0 self-start pt-1 text-sm">
              {field.prefix}
            </div>
          )}
          <div className="relative flex-1">
            {textareaElement}
            {hasSuffix && (
              <div className={cn(
                "text-muted-foreground absolute text-sm",
                getResizeStyle() !== 'none' ? "bottom-0 right-2" : "bottom-0 right-0"
              )}>
                {field.suffix}
              </div>
            )}
          </div>
        </div>
      ) : (
        textareaElement
      )}
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
