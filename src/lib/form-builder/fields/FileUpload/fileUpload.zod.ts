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
        originalSize: z.number().positive().optional(),
        optimized: z.boolean().optional(),
    });

    // Define the base schema for the FileUploadValue with preprocessing
    let schema = z.preprocess((input) => {
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

    // Validate file count limits
    if (field.maxFiles !== undefined) {
        schema = schema.refine(
            (value) => value.files.length <= field.maxFiles!,
            { message: `Maximum ${field.maxFiles} files allowed` }
        );
    }

    // Validate individual file sizes if maxSize is specified
    if (field.maxSize !== undefined) {
        schema = schema.refine(
            (value) => value.files.every(file => file.size <= field.maxSize!),
            { message: `File size must not exceed ${Math.round(field.maxSize! / 1024 / 1024)}MB` }
        );
    }

    // Validate file types if accept is specified
    if (field.accept) {
        const acceptedTypes = field.accept.split(',').map(type => type.trim());
        schema = schema.refine(
            (value) => value.files.every(file => {
                // Check if file type matches any of the accepted types
                return acceptedTypes.some(acceptedType => {
                    if (acceptedType.startsWith('.')) {
                        // File extension check
                        return file.name.toLowerCase().endsWith(acceptedType.toLowerCase());
                    } else if (acceptedType.includes('*')) {
                        // MIME type wildcard check (e.g., "image/*")
                        const [mainType] = acceptedType.split('/');
                        const [fileMainType] = file.type.split('/');
                        return mainType === fileMainType;
                    } else {
                        // Exact MIME type check
                        return file.type === acceptedType;
                    }
                });
            }),
            { message: `File type not allowed. Accepted types: ${field.accept}` }
        );
    }

    // Handle required validation
    if (field.required) {
        schema = schema.refine(
            (value) => value.files.length > 0,
            { message: 'At least one file is required' }
        );
    }

    // Return optional schema if not required
    if (!field.required) {
        return schema.optional();
    }

    return schema;
}