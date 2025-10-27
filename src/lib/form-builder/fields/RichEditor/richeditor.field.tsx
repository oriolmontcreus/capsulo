'use client';

import React, { useMemo, useCallback, useRef } from 'react';
import type { RichEditorField as RichEditorFieldType } from './richeditor.types';
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';
import { cn } from '@/lib/utils';
import { Plate, usePlateEditor } from 'platejs/react';
import { EditorKit } from '@/components/editor-kit';
import { Editor, EditorContainer } from '@/components/ui/editor';

interface RichEditorFieldProps {
    field: RichEditorFieldType;
    value: any;
    onChange: (value: any) => void;
    error?: string;
}

// Calculate character count for display (memoized outside component)
const getTextLength = (nodes: any[]): number => {
    if (!nodes) return 0;
    return nodes.reduce((acc, node) => {
        if (node.text !== undefined) return acc + node.text.length;
        if (node.children) return acc + getTextLength(node.children);
        return acc;
    }, 0);
};

export const RichEditorField: React.FC<RichEditorFieldProps> = React.memo(({
    field,
    value,
    onChange,
    error
}) => {
    // Create editor only once, don't recreate on every render
    const editor = usePlateEditor(
        {
            plugins: EditorKit,
            value: value || [
                {
                    type: 'p',
                    children: [{ text: '' }],
                },
            ],
        },
        [] // Empty deps array - only create once
    );

    // Debounce onChange to prevent excessive parent updates
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const handleChange = useCallback(
        ({ value: newValue }: { value: any }) => {
            // Clear existing timer
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            // Debounce the onChange call
            debounceTimerRef.current = setTimeout(() => {
                onChange(newValue);
            }, 150);
        },
        [onChange]
    );

    // Cleanup debounce timer on unmount
    React.useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // Memoize text length calculation
    const textLength = useMemo(() => getTextLength(value || []), [value]);

    return (
        <Field data-invalid={!!error}>
            <div className="flex justify-between items-center mb-2">
                <FieldLabel htmlFor={field.name} required={field.required}>
                    {field.label || field.name}
                </FieldLabel>
                {field.maxLength && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {textLength} / {field.maxLength}
                    </span>
                )}
            </div>

            <div className={cn("rounded-md border", error && "border-destructive")}>
                <Plate
                    editor={editor}
                    onChange={handleChange}
                >
                    <EditorContainer variant={field.variant}>
                        <Editor
                            variant={field.variant}
                            placeholder={field.placeholder}
                            aria-invalid={!!error}
                        />
                    </EditorContainer>
                </Plate>
            </div>

            {error ? (
                <FieldError>{error}</FieldError>
            ) : field.description ? (
                <FieldDescription>{field.description}</FieldDescription>
            ) : null}
        </Field>
    );
}, (prevProps, nextProps) => {
    // Custom comparison: only re-render if these specific values changed
    return (
        prevProps.value === nextProps.value &&
        prevProps.error === nextProps.error &&
        prevProps.field.name === nextProps.field.name &&
        prevProps.field.label === nextProps.field.label &&
        prevProps.field.variant === nextProps.field.variant &&
        prevProps.field.maxLength === nextProps.field.maxLength
    );
});

RichEditorField.displayName = 'RichEditorField';
