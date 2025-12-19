import React from 'react';
import type { InputField as InputFieldType } from './input.types';
import { Input as InputUI } from '@/components/ui/input';
import { Field, FieldDescription, FieldError } from '@/components/ui/field';
import { FieldLabel } from '../../components/FieldLabel';
import { LexicalCMSField } from '../../lexical/LexicalCMSField';
import { cn } from '@/lib/utils';

interface ComponentData {
  id: string;
  schemaName: string;
  data: Record<string, { type: any; value: any }>;
}

interface InputFieldProps {
  field: InputFieldType;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  fieldPath?: string;
  componentData?: ComponentData;
  formData?: Record<string, any>;
  locale?: string;
}

export const InputField: React.FC<InputFieldProps> = React.memo(({ field, value, onChange, error, fieldPath, componentData, formData, locale }) => {
  const hasPrefix = !!field.prefix;
  const hasSuffix = !!field.suffix;
  const hasAddon = hasPrefix || hasSuffix;
  const isNumber = field.inputType === 'number';
  const textValue = value ?? '';

  const [showGlobalSelect, setShowGlobalSelect] = React.useState(false);

  // Handle number input change - convert to number
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    // Check for variable trigger "{{"
    if (!isNumber && val.endsWith('{{')) {
      setShowGlobalSelect(true);
    }

    if (isNumber) {
      onChange(val === '' ? '' : Number(val));
    } else {
      onChange(val);
    }
  };

  const handleVariableSelect = (key: string) => {
    // Append the selected variable key and closing brace
    // We assume the user just typed "{{" so we append "key}}" 
    // Result: "{{key}}"
    onChange(textValue + key + '}}');
    setShowGlobalSelect(false);
  };

  // Get the step value
  const getStep = () => {
    if (field.step !== undefined) return field.step;
    if (field.allowDecimals === false) return 1;
    return undefined;
  };

  /* 
    Lexical Integration:
    For number fields, we rely on the native Input component to enforce strictly numeric input.
    For text fields, we use Lexical to support variables.
  */

  const wrappedInput = isNumber ? (
    <InputUI
      type="number"
      value={value ?? ''}
      onChange={handleChange}
      className={cn(error && "border-destructive", "h-9")}
      placeholder={field.placeholder}
      step={getStep()}
      id={fieldPath || field.name}
    />
  ) : (
    <LexicalCMSField
      value={textValue}
      onChange={onChange}
      multiline={false} // Input mode
      className={cn(error && "border-destructive")}
      inputClassName="h-9 py-1.5" // Match input height
      placeholder={field.placeholder}
      id={fieldPath || field.name}
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
            "border-border/60 bg-input focus-within:border-ring focus-within:ring-ring/50 flex h-9 w-full items-center gap-2 rounded-md border px-3 shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]",
            error && "border-destructive"
          )}
          aria-invalid={!!error}
        >
          {hasPrefix && (
            <div className="text-muted-foreground flex shrink-0 items-center text-sm">
              {field.prefix}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {isNumber ? (
              <InputUI
                type="number"
                value={value ?? ''}
                onChange={handleChange}
                className="border-0 shadow-none focus-visible:ring-0 px-0 h-auto py-1"
                placeholder={field.placeholder}
                step={getStep()}
                id={fieldPath || field.name}
              />
            ) : (
              <LexicalCMSField
                value={textValue}
                onChange={onChange}
                multiline={false}
                className="border-0 shadow-none focus-within:ring-0 py-0 h-auto min-h-0"
                inputClassName="px-0 py-1"
                placeholder={field.placeholder}
                id={fieldPath || field.name}
                locale={locale}
              />
            )}
          </div>
          {hasSuffix && (
            <div className="text-muted-foreground flex shrink-0 items-center text-sm">
              {field.suffix}
            </div>
          )}
        </div>
      ) : (
        wrappedInput
      )}
      {/* Error message (takes priority over description) */}
      {error ? (
        <FieldError>{error}</FieldError>
      ) : field.description && field.maxLength && !isNumber ? (
        <FieldDescription className="flex justify-between items-center">
          <span>{field.description}</span>
          <span className="text-xs whitespace-nowrap">
            {textValue.length} / {field.maxLength}
          </span>
        </FieldDescription>
      ) : field.description ? (
        <FieldDescription>{field.description}</FieldDescription>
      ) : field.maxLength && !isNumber ? (
        <div className="text-xs text-muted-foreground text-right whitespace-nowrap">
          {textValue.length} / {field.maxLength}
        </div>
      ) : null}
    </Field>
  );
}, (prevProps, nextProps) => {
  // Only re-render if value or error changed
  return prevProps.value === nextProps.value && prevProps.error === nextProps.error;
});


