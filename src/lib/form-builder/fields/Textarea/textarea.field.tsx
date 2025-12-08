import React, { useRef, useEffect } from 'react';
import type { TextareaField as TextareaFieldType } from './textarea.types';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldDescription, FieldError } from '@/components/ui/field';
import { FieldLabel } from '../../components/FieldLabel';
import { LexicalCMSField } from '../../lexical/LexicalCMSField';
import { cn } from '@/lib/utils';

interface ComponentData {
  id: string;
  schemaName: string;
  data: Record<string, { type: any; value: any }>;
}

interface TextareaFieldProps {
  field: TextareaFieldType;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  fieldPath?: string;
  componentData?: ComponentData;
  formData?: Record<string, any>;
  locale?: string;
}

export const TextareaField: React.FC<TextareaFieldProps> = React.memo(({ field, value, onChange, error, fieldPath, componentData, formData, locale }) => {
  const textValue = value || '';
  const hasPrefix = !!field.prefix;
  const hasSuffix = !!field.suffix;
  const hasAddon = hasPrefix || hasSuffix;

  // Lexical Integration
  const wrapperElement = (
    <LexicalCMSField
      value={textValue}
      onChange={onChange}
      multiline={true}
      className={cn(error && "border-destructive")}
      inputClassName="h-full px-3 py-2 min-h-[80px]"
      placeholder={field.placeholder}
      id={fieldPath || field.name}
      autoResize={field.autoResize !== false} // Default to true if undefined
      rows={field.rows}
      minRows={field.minRows}
      maxRows={field.maxRows}
      locale={locale}
    />
  );

  return (
    <Field data-invalid={!!error}>
      <FieldLabel
        htmlFor={fieldPath || field.name}
        required={field.required}
        fieldPath={fieldPath}
        translatable={field.translatable}
        componentData={componentData}
        formData={formData}
      >
        {field.label || field.name}
      </FieldLabel>
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
            <LexicalCMSField
              value={textValue}
              onChange={onChange}
              multiline={true}
              className="border-0 shadow-none focus-within:ring-0 py-0 h-auto min-h-0"
              inputClassName="px-0 py-0"
              placeholder={field.placeholder}
              id={fieldPath || field.name}
              autoResize={field.autoResize !== false}
              rows={field.rows}
              minRows={field.minRows}
              maxRows={field.maxRows}
              locale={locale}
            />
            {hasSuffix && (
              <div className={cn(
                "text-muted-foreground absolute right-0 bottom-0 text-sm",
                "bottom-0 right-0"
              )}>
                {field.suffix}
              </div>
            )}
          </div>
        </div>
      ) : (
        wrapperElement
      )}

      {/* Error message (takes priority over description) */}
      {error ? (
        <FieldError>{error}</FieldError>
      ) : field.description && field.maxLength ? (
        <FieldDescription className="flex justify-between items-center">
          <span>{field.description}</span>
          <span className="text-xs whitespace-nowrap">
            {String(textValue).length} / {field.maxLength}
          </span>
        </FieldDescription>
      ) : field.description ? (
        <FieldDescription>{field.description}</FieldDescription>
      ) : field.maxLength ? (
        <div className="text-xs text-muted-foreground text-right whitespace-nowrap">
          {String(textValue).length} / {field.maxLength}
        </div>
      ) : null}
    </Field>
  );
}, (prevProps, nextProps) => {
  return prevProps.value === nextProps.value && prevProps.error === nextProps.error;
});
