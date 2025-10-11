import React from 'react';
import type { RichEditorField as RichEditorFieldType } from '@/lib/form-builder';
import { Label } from '@/components/ui/label';

interface RichEditorFieldProps {
  field: RichEditorFieldType;
  value: any;
  onChange: (value: any) => void;
}

export const RichEditorField: React.FC<RichEditorFieldProps> = ({ field, value, onChange }) => (
  <div className="space-y-2">
    <Label htmlFor={field.name}>
      {field.label || field.name}
      {field.required && <span className="text-red-500 ml-1">*</span>}
    </Label>
    <textarea
      id={field.name}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      required={field.required}
      rows={6}
      className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
    />
    <div className="text-xs text-muted-foreground">
      Rich editor (Phase 2: Will include formatting tools)
    </div>
  </div>
);

