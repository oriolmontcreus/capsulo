'use client';

import React, { useCallback, useMemo, Suspense } from 'react';
import type { SerializedEditorState } from 'lexical';
import type { RichEditorField as RichEditorFieldType } from './richeditor.types';
import { Field, FieldDescription, FieldError } from '@/components/ui/field';
import { FieldLabel } from '../../components/FieldLabel';

// Lazy load the editor to avoid loading 800KB+ bundle on initial page load
const ConfigurableEditor = React.lazy(() =>
    import('@/components/blocks/editor-x/configurable-editor').then(m => ({
        default: m.ConfigurableEditor
    }))
);

// Skeleton loader for the editor while it's loading
const EditorSkeleton = () => (
    <div className="bg-input overflow-hidden rounded-lg border border-border/60 shadow-xs animate-pulse">
        <div className="h-10 bg-input border-b" />
        <div className="p-4 space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-5/6" />
        </div>
        <div className="h-8 bg-muted border-t" />
    </div>
);

interface RichEditorFieldProps {
    field: RichEditorFieldType;
    value: any;
    onChange: (value: any) => void;
    error?: string;
    fieldPath?: string;
    componentData?: any;
    formData?: any;
    diffMode?: boolean;
    diffOldValue?: any;
    readOnly?: boolean;
}


// Debounce helper that flushes pending calls on unmount
function useDebouncedCallback<T extends (...args: any[]) => void>(
    callback: T,
    delay: number
) {
    const callbackRef = React.useRef(callback);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const lastArgsRef = React.useRef<Parameters<T> | null>(null);
    const hasPendingRef = React.useRef(false);

    React.useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    const debounced = React.useCallback((...args: Parameters<T>) => {
        lastArgsRef.current = args;
        hasPendingRef.current = true;

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            callbackRef.current(...args);
            hasPendingRef.current = false;
        }, delay);
    }, [delay]);

    React.useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            // Flush pending value on unmount
            if (hasPendingRef.current && lastArgsRef.current) {
                callbackRef.current(...lastArgsRef.current);
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
    diffMode,
    diffOldValue,
    readOnly,
}) => {
    // Debounce changes to avoid blocking the main thread on heavy forms
    const debouncedOnChange = useDebouncedCallback((val: any) => {
        if (readOnly) return;
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

            <Suspense fallback={<EditorSkeleton />}>
                <ConfigurableEditor
                    editorSerializedState={editorSerializedState}
                    editorStateJson={editorStateJson}
                    onSerializedChange={handleSerializedChange}
                    enabledFeatures={field.features}
                    disabledFeatures={field.disableFeatures}
                    disableAllFeatures={field.disableAllFeatures}
                    maxLength={field.maxLength}
                    uploadComponentId={componentData?.id}
                    uploadFieldName={field.name}
                    error={error}
                    diffMode={diffMode}
                    diffOldValue={diffOldValue}
                    readOnly={readOnly}
                />
            </Suspense>

            {error && <FieldError>{error}</FieldError>}
        </Field>
    );
});

RichEditorField.displayName = 'RichEditorField';