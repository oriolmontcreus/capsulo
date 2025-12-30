"use client"

import React from 'react';
import type { ColorPickerField as ColorPickerFieldType } from './colorpicker.types';
import { Button } from '@/components/ui/button';
import {
    ColorPicker,
    ColorPickerTrigger,
    ColorPickerContent,
    ColorPickerArea,
    ColorPickerHueSlider,
    ColorPickerAlphaSlider,
    ColorPickerSwatch,
    ColorPickerEyeDropper,
    ColorPickerFormatSelect,
    ColorPickerInput,
} from '@/components/editor/editor-ui/color-picker';
import { Field, FieldDescription, FieldError } from '@/components/ui/field';
import { FieldLabel } from '../../components/FieldLabel';
import { useDebouncedCallback } from '@/lib/hooks/useDebouncedCallback';

interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

interface ColorPickerFieldProps {
    field: ColorPickerFieldType;
    value: any;
    onChange: (value: any) => void;
    error?: string;
    fieldPath?: string;
    componentData?: ComponentData;
    formData?: Record<string, any>;
}

const COLOR_CHANGE_DEBOUNCE_MS = 100;

export const ColorPickerField: React.FC<ColorPickerFieldProps> = React.memo(
    ({ field, value, onChange, error, fieldPath, componentData, formData }) => {
        //We MUST debounce the onChange to prevent excessive parent form updates when dragging.
        const debouncedOnChange = useDebouncedCallback((newColor: string) => {
            onChange(newColor);
        }, COLOR_CHANGE_DEBOUNCE_MS);

        return (
            <Field data-invalid={!!error}>
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

                <ColorPicker
                    modal
                    defaultFormat="hex"
                    value={value}
                    onValueChange={debouncedOnChange}
                >
                    <ColorPickerTrigger asChild>
                        <Button
                            variant="ghost"
                            className="flex bg-sidebar border border-border/60 h-fit w-32 items-center gap-2 p-1 justify-start"
                            type="button"
                        >
                            <ColorPickerSwatch className="size-[26.4px] rounded-md shrink-0" />
                            <span className="text-sm font-mono truncate">{value ?? '#000000'}</span>
                        </Button>
                    </ColorPickerTrigger>
                    <ColorPickerContent>
                        <ColorPickerArea />
                        <div className="flex items-center gap-2">
                            <ColorPickerEyeDropper />
                            <div className="flex flex-1 flex-col gap-2">
                                <ColorPickerHueSlider />
                                {field.showAlpha && <ColorPickerAlphaSlider />}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <ColorPickerFormatSelect />
                            <ColorPickerInput />
                        </div>
                    </ColorPickerContent>
                </ColorPicker>

                {error ? (
                    <FieldError>{error}</FieldError>
                ) : field.description ? (
                    <FieldDescription>{field.description}</FieldDescription>
                ) : null}
            </Field>
        );
    },
    (prevProps, nextProps) => {
        return prevProps.value === nextProps.value && prevProps.error === nextProps.error;
    }
);

