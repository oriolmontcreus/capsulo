"use client"

import React from 'react';
import { parseColor, Input as AriaInput } from 'react-aria-components';
import type { ColorPickerField as ColorPickerFieldType } from './colorpicker.types';
import { Button } from '@/components/ui/button';
import {
    ColorArea,
    ColorField,
    ColorPicker,
    ColorSlider,
    ColorSwatch,
    ColorSwatchPicker,
    ColorSwatchPickerItem,
    ColorThumb,
    SliderTrack,
} from '@/components/ui/color';
import { Field, FieldDescription, FieldError } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FieldLabel } from '../../components/FieldLabel';
import { cn } from '@/lib/utils';

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

export const ColorPickerField: React.FC<ColorPickerFieldProps> = React.memo(
    ({ field, value, onChange, error, fieldPath, componentData, formData }) => {
        const colorValue = React.useMemo(() => {
            try {
                return value ? parseColor(value) : parseColor('#000000');
            } catch {
                return parseColor('#000000');
            }
        }, [value]);

        const handleColorChange = (color: any) => {
            // Use hexa format if alpha is enabled, otherwise use hex
            const format = field.showAlpha ? 'hexa' : 'hex';
            onChange(color.toString(format));
        };

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

                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            className="flex h-fit items-center gap-2 p-1 justify-start"
                            type="button"
                        >
                            <div
                                className="size-8 rounded-md border-2"
                                style={{ backgroundColor: value || '#000000' }}
                            />
                            <span className="text-sm">{value || 'Select Color'}</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-fit p-3 bg-background">
                        <ColorPicker value={colorValue} onChange={handleColorChange}>
                            <div className="flex flex-col gap-4">
                                <div className="rounded-md border border-border shadow-md">
                                    <ColorArea
                                        colorSpace="hsb"
                                        xChannel="saturation"
                                        yChannel="brightness"
                                        className="h-[136px] rounded-t-md rounded-b-none border-0 shadow-none"
                                        aria-label="Color picker area"
                                    >
                                        <ColorThumb className="z-50" />
                                    </ColorArea>
                                    <ColorSlider colorSpace="hsb" channel="hue" aria-label="Hue">
                                        <SliderTrack className="rounded-none border-0 shadow-none">
                                            <ColorThumb className="top-1/2" />
                                        </SliderTrack>
                                    </ColorSlider>
                                    {field.showAlpha && (
                                        <ColorSlider colorSpace="hsb" channel="alpha" aria-label="Alpha">
                                            <SliderTrack
                                                className="rounded-b-md rounded-t-none border-0 shadow-none"
                                                style={({ defaultStyle }) => ({
                                                    background: `${defaultStyle.background},
                            repeating-conic-gradient(#CCC 0% 25%, white 0% 50%) 50% / 16px 16px`,
                                                })}
                                            >
                                                <ColorThumb className="top-1/2" />
                                            </SliderTrack>
                                        </ColorSlider>
                                    )}
                                </div>

                                <ColorField className="w-[192px]" aria-label="Hex color value">
                                    <Label>Hex</Label>
                                    <AriaInput
                                        className={cn(
                                            "mt-2 file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-sidebar border-input h-9 w-full min-w-0 rounded-md border bg-sidebar px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                                            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                                            "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border-border/60"
                                        )}
                                    />
                                </ColorField>

                                {field.showAlpha && (
                                    <ColorField channel="alpha" className="w-[192px]" aria-label="Alpha channel value">
                                        <Label>Alpha</Label>
                                        <AriaInput
                                            className={cn(
                                                "mt-2 file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-sidebar border-input h-9 w-full min-w-0 rounded-md border bg-sidebar px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                                                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                                                "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border-border/60"
                                            )}
                                        />
                                    </ColorField>
                                )}

                                {field.presetColors && field.presetColors.length > 0 && (
                                    <ColorSwatchPicker className="w-[192px]">
                                        {field.presetColors.map((color) => (
                                            <ColorSwatchPickerItem key={color} color={color}>
                                                <ColorSwatch />
                                            </ColorSwatchPickerItem>
                                        ))}
                                    </ColorSwatchPicker>
                                )}
                            </div>
                        </ColorPicker>
                    </PopoverContent>
                </Popover>

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
