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

export const RichEditorField: React.FC<RichEditorFieldProps> = React.memo(({
    error,
    field,
    value,
    onChange,
    fieldPath,
    componentData,
    formData,
}) => {
    const handleSerializedChange = useCallback((editorSerializedState: SerializedEditorState) => {
        onChange(editorSerializedState);
    }, [onChange]);

    // Parse the value if it's a string
    const editorSerializedState = React.useMemo(() => {
        if (!value) return undefined;
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                return undefined;
            }
        }
        return value;
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