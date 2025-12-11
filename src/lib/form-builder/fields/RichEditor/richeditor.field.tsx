'use client';

import React, { useCallback, useMemo } from 'react';
import type { SerializedEditorState } from 'lexical';
import type { RichEditorField as RichEditorFieldType } from './richeditor.types';
import { Field, FieldDescription, FieldError } from '@/components/ui/field';
import { FieldLabel } from '../../components/FieldLabel';
import { ConfigurableEditor } from '@/components/blocks/editor-x/configurable-editor';

interface RichEditorFieldProps {
    field: RichEditorFieldType;
    value: any;
    onChange: (value: any) => void;
    error?: string;
    fieldPath?: string;
    componentData?: any;
    formData?: any;
}


// Helper for debouncing callbacks
function useDebouncedCallback<T extends (...args: any[]) => void>(
    callback: T,
    delay: number
) {
    const callbackRef = React.useRef(callback);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    const debounced = React.useCallback((...args: Parameters<T>) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            callbackRef.current(...args);
        }, delay);
    }, [delay]);

    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return debounced;
}

export const RichEditorField: React.FC<RichEditorFieldProps> = React.memo(({
    error,
    field,
    value,
    onChange,
    fieldPath,
    componentData,
    formData,
}) => {
    // Debounce the change propagation to avoid blocking the main thread on every keystroke
    // when the parent form is heavy.
    const debouncedOnChange = useDebouncedCallback((val: any) => {
        onChange(val);
    }, 300);

    const handleSerializedChange = useCallback((editorSerializedState: SerializedEditorState) => {
        debouncedOnChange(editorSerializedState);
    }, [debouncedOnChange]);

    // Determine if value is a JSON string or object
    const { editorSerializedState, editorStateJson } = React.useMemo(() => {
        if (!value) return { editorSerializedState: undefined, editorStateJson: undefined };

        if (typeof value === 'string') {
            // Optimization: Simple check for JSON string to avoid parsing
            // This assumes valid Lexical state always starts with '{'
            if (value.trim().startsWith('{')) {
                return { editorSerializedState: undefined, editorStateJson: value };
            }
            // Fallback for non-JSON strings (e.g. simple text default values): 
            // Treat as undefined (empty editor) to match previous behavior 
            // where JSON.parse failure resulted in undefined.
            return { editorSerializedState: undefined, editorStateJson: undefined };
        }

        // Value is likely an object (SerializedEditorState)
        return { editorSerializedState: value, editorStateJson: undefined };
    }, [value]);

    return (
        <Field>
            <FieldLabel
                htmlFor={field.name}
                required={field.required}
                fieldPath={fieldPath}
                translatable={field.translatable}
                componentData={componentData}
                formData={formData}
            >
                {field.label || field.name}
            </FieldLabel>
            {field.description && (
                <FieldDescription>{field.description}</FieldDescription>
            )}

            <ConfigurableEditor
                editorSerializedState={editorSerializedState}
                editorStateJson={editorStateJson}
                onSerializedChange={handleSerializedChange}
                enabledFeatures={field.features}
                disabledFeatures={field.disableFeatures}
                disableAllFeatures={field.disableAllFeatures}
                maxLength={field.maxLength}
            />

            {error && <FieldError>{error}</FieldError>}
        </Field>
    );
});

RichEditorField.displayName = 'RichEditorField';