import { z } from 'zod';
import type { FileUploadField } from './fileUpload.types';

/**
 * Converts a FileUpload field to a Zod schema
 */
export function fileUploadToZod(field: FileUploadField): z.ZodTypeAny {
    // Define the schema for individual file objects
    const fileSchema = z.object({
        url: z.string().url('Invalid file URL'),
        name: z.string().min(1, 'File name is required'),
        size: z.number().positive('File size must be positive'),
        type: z.string().min(1, 'File type is required'),
    });

    // Create base schema with preprocessing
    const baseSchema = z.preprocess((input) => {
        // Handle string inputs (JSON serialized data)
        if (typeof input === 'string') {
            try {
                return JSON.parse(input);
            } catch {
                return { files: [] };
            }
        }

        // Handle null/undefined
        if (input == null) {
            return { files: [] };
        }

        // Handle objects that might not have the files property
        if (typeof input === 'object' && !('files' in input)) {
            return { files: [] };
        }

        return input;
    }, z.object({
        files: z.array(fileSchema),
    }));

    // Build validation refinements
    const refinements: Array<{
        check: (value: any) => boolean;
        message: string;
    }> = [];

    // File count validation
    if (field.maxFiles !== undefined) {
        refinements.push({
            check: (value) => value.files.length <= field.maxFiles!,
            message: `Maximum ${field.maxFiles} files allowed`
        });
    }

    // File size validation
    if (field.maxSize !== undefined) {
        refinements.push({
            check: (value) => value.files.every((file: any) => file.size <= field.maxSize!),
            message: `File size must not exceed ${Math.round(field.maxSize! / 1024 / 1024)}MB`
        });
    }

    // File type validation
    if (field.accept) {
        const acceptedTypes = field.accept.split(',').map(type => type.trim());
        refinements.push({
            check: (value) => value.files.every((file: any) => {
                return acceptedTypes.some(acceptedType => {
                    if (acceptedType.startsWith('.')) {
                        return file.name.toLowerCase().endsWith(acceptedType.toLowerCase());
                    } else if (acceptedType.includes('*')) {
                        const [mainType] = acceptedType.split('/');
                        const [fileMainType] = file.type.split('/');
                        return mainType === fileMainType;
                    } else {
                        return file.type === acceptedType;
                    }
                });
            }),
            message: `File type not allowed. Accepted types: ${field.accept}`
        });
    }

    // Required validation
    if (field.required && typeof field.required !== 'function') {
        refinements.push({
            check: (value) => value.files.length > 0,
            message: 'At least one file is required'
        });
    }

    // Apply all refinements
    let finalSchema: z.ZodTypeAny = baseSchema;
    for (const refinement of refinements) {
        finalSchema = finalSchema.refine(refinement.check, { message: refinement.message });
    }

    // Return optional schema if not required
    if (!field.required || typeof field.required === 'function') {
        return finalSchema.optional();
    }

    return finalSchema;
}