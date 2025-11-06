// TODO: Implement a new rich text editor solution to replace Plate.js
// The current Plate.js implementation was removed due to performance issues and build problems

'use client';

import React, { useCallback } from 'react';
import type { RichEditorField as RichEditorFieldType } from './richeditor.types';
import { Field, FieldDescription, FieldError } from '@/components/ui/field';
import { FieldLabel } from '../../components/FieldLabel';
import { cn } from '@/lib/utils';

interface RichEditorFieldProps {
    field: RichEditorFieldType;
    value: any;
    onChange: (value: any) => void;
    error?: string;
    fieldPath?: string;
    componentData?: any;
    formData?: any;
}

export const RichEditorField: React.FC<RichEditorFieldProps> = React.memo(({
    error,
    field,
    value,
    onChange,
}) => {
    // TODO: Replace with a new rich text editor implementation
    // For now, show a simple textarea as fallback
    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
    }, [onChange]);

    const displayValue = typeof value === 'string' ? value :
        value?.content ? JSON.stringify(value.content) :
            JSON.stringify(value || '');

    return (
        <Field>
            <FieldLabel field={field} />
            {field.description && (
                <FieldDescription>{field.description}</FieldDescription>
            )}

            <div className="space-y-2">
                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                    ⚠️ Rich text editor temporarily unavailable. Using plain text fallback.
                </div>

                <textarea
                    value={displayValue}
                    onChange={handleChange}
                    placeholder={field.placeholder || 'Enter text...'}
                    className={cn(
                        "min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        error && "border-destructive"
                    )}
                    rows={6}
                />
            </div>

            {error && <FieldError>{error}</FieldError>}
        </Field>
    );
});

RichEditorField.displayName = 'RichEditorField';