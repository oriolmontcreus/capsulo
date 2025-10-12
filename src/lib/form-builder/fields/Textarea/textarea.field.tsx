import React from 'react';
import type { TextareaField as TextareaFieldType } from './textarea.types';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface TextareaFieldProps {
  field: TextareaFieldType;
  value: any;
  onChange: (value: any) => void;
}

export const TextareaField: React.FC<TextareaFieldProps> = ({ field, value, onChange }) => {
  const textValue = value || '';

  return (
    <div className="space-y-3">
      <Label htmlFor={field.name} className="text-sm font-medium text-foreground/80">
        {field.label || field.name}
        {field.required && <span className="text-red-500/80 ml-1">*</span>}
      </Label>
      <Textarea
        id={field.name}
        value={textValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        required={field.required}
        rows={field.rows || 3}
        maxLength={field.maxLength}
      />
      {field.maxLength && (
        <div className="text-xs text-muted-foreground text-right">
          {textValue.length} / {field.maxLength}
        </div>
      )}
    </div>
  );
};
