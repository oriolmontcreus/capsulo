import type { FileUploadField, FileUploadValue, ImageOptimizationConfig, FileUploadVariant, AspectRatio, InlineConfig } from './fileUpload.types';
import type { ColSpanValue } from '../../core/translation.types';

class FileUploadBuilder {
    private field: FileUploadField;

    constructor(name: string) {
        this.field = {
            type: 'fileUpload',
            name,
            multiple: false,
        };
    }

    label(value: string): this {
        this.field.label = value;
        return this;
    }

    description(value: string): this {
        this.field.description = value;
        return this;
    }

    required<T = Record<string, any>>(value: boolean | ((formData: T) => boolean) = true): this {
        this.field.required = value;
        return this;
    }

    defaultValue(value: FileUploadValue): this {
        this.field.defaultValue = value;
        return this;
    }

    accept(value: string): this {
        this.field.accept = value;
        return this;
    }

    maxSize(bytes: number): this {
        this.field.maxSize = bytes;
        return this;
    }

    maxFiles(count: number): this {
        this.field.maxFiles = count;
        return this;
    }

    multiple(value: boolean = true): this {
        this.field.multiple = value;
        return this;
    }

    variant(value: FileUploadVariant): this {
        this.field.variant = value;
        return this;
    }

    inlineConfig(config: InlineConfig): this {
        this.field.inlineConfig = config;
        return this;
    }

    aspectRatio(ratio: AspectRatio): this {
        if (!this.field.inlineConfig) {
            this.field.inlineConfig = {};
        }
        this.field.inlineConfig.aspectRatio = ratio;
        return this;
    }

    width(value: string): this {
        if (!this.field.inlineConfig) {
            this.field.inlineConfig = {};
        }
        this.field.inlineConfig.width = value;
        return this;
    }

    height(value: string): this {
        if (!this.field.inlineConfig) {
            this.field.inlineConfig = {};
        }
        this.field.inlineConfig.height = value;
        return this;
    }

    imageOptimization(config: ImageOptimizationConfig): this {
        this.field.imageOptimization = config;
        return this;
    }

    // Convenience methods for common configurations
    images(): this {
        this.field.accept = 'image/*';
        this.field.imageOptimization = {
            enableWebPConversion: true,
            quality: 85,
            maxWidth: 1920,
            maxHeight: 1080,
            supportedFormats: ['image/jpeg', 'image/png']
        };
        return this;
    }

    documents(): this {
        this.field.accept = '.pdf,.doc,.docx,.txt,.rtf';
        return this;
    }

    media(): this {
        this.field.accept = 'image/*,video/*,audio/*';
        return this;
    }

    // Convenience methods for inline variants
    inline(): this {
        this.field.variant = 'inline';
        this.field.multiple = false;
        this.field.maxFiles = 1;
        return this;
    }

    avatar(): this {
        return this.inline()
            .images()
            .aspectRatio('square')
            .width('200px')
            .maxSize(2 * 1024 * 1024); // 2MB
    }

    cover(): this {
        return this.inline()
            .images()
            .aspectRatio('wide')
            .width('100%')
            .maxSize(5 * 1024 * 1024); // 5MB
    }

    thumbnail(): this {
        return this.inline()
            .images()
            .aspectRatio('square')
            .width('150px')
            .maxSize(1 * 1024 * 1024); // 1MB
    }

    showInTable(value: boolean = true): this {
        this.field.showInTable = value;
        return this;
    }

    /**
     * @param value - Boolean to hide/show field, or function receiving formData to determine visibility. Defaults to `true`.
     */
    hidden<T = Record<string, any>>(value: boolean | ((formData: T) => boolean) = true): this {
        this.field.hidden = value;
        return this;
    }

    /**
     * Set the column span for this field when rendered in a grid layout
     * @param value - Number of columns to span, "full" for all columns, or responsive object
     */
    colSpan(value: ColSpanValue): this {
        this.field.colSpan = value;
        return this;
    }

    build(): FileUploadField {
        return this.field;
    }
}

export const FileUpload = (name: string): FileUploadBuilder => new FileUploadBuilder(name);