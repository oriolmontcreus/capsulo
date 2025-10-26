'use client';

import React from 'react';
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

export const RichEditorField: React.FC<RichEditorFieldProps> = React.memo(({
    field,
    value,
    onChange,
    error
}) => {
    const editor = usePlateEditor({
        plugins: EditorKit,
        value: value || [
            {
                type: 'p',
                children: [{ text: '' }],
            },
        ],
    });

    // Calculate character count for display
    const getTextLength = (nodes: any[]): number => {
        if (!nodes) return 0;
        return nodes.reduce((acc, node) => {
            if (node.text !== undefined) return acc + node.text.length;
            if (node.children) return acc + getTextLength(node.children);
            return acc;
        }, 0);
    };

    const textLength = getTextLength(value || []);

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
                    onChange={({ value: newValue }) => onChange(newValue)}
                >
                    <EditorContainer variant={field.variant === 'ai' || field.variant === 'aiChat' ? 'default' : field.variant}>
                        <Editor
                            variant={field.variant === 'ai' || field.variant === 'aiChat' ? 'default' : field.variant}
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
    // Only re-render if value or error changed
    // Note: Deep comparison for PlateJS value would be expensive, so we rely on reference equality
    return prevProps.value === nextProps.value && prevProps.error === nextProps.error;
});
