import type { FileUploadField, FileUploadValue, FileUploadConfig, ImageOptimizationConfig } from './fileUpload.types';

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

    required(value: boolean = true): this {
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

    r2Config(config: FileUploadConfig): this {
        this.field.r2Config = config;
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

    build(): FileUploadField {
        return this.field;
    }
}

export const FileUpload = (name: string): FileUploadBuilder => new FileUploadBuilder(name);