import { z } from 'zod';
import type { RichEditorField } from './richeditor.types';

/**
 * Converts a RichEditor field to a Zod schema
 */
export function richeditorToZod(field: RichEditorField): z.ZodTypeAny {
    // Define the schema for the structure with content and discussions
    let baseSchema: z.ZodTypeAny = z.object({
        content: z.array(z.any()),
        discussions: z.array(z.any()).optional(),
    });

    // Apply custom validation based on text length if needed
    if (field.minLength || field.maxLength) {
        baseSchema = baseSchema.refine(
            (value) => {
                const textLength = getTextLength(value.content);

                if (field.minLength && textLength < field.minLength) {
                    return false;
                }

                if (field.maxLength && textLength > field.maxLength) {
                    return false;
                }

                return true;
            },
            (value) => {
                const textLength = getTextLength(value.content);

                if (field.minLength && textLength < field.minLength) {
                    return { message: `Minimum ${field.minLength} characters required` };
                }

                if (field.maxLength && textLength > field.maxLength) {
                    return { message: `Maximum ${field.maxLength} characters allowed` };
                }

                return { message: 'Invalid content' };
            }
        );
    }

    if (!field.required) return baseSchema.optional();

    return baseSchema;
}

/**
 * Helper function to calculate text length from Plate editor nodes
 */
function getTextLength(nodes: any[]): number {
    if (!nodes || !Array.isArray(nodes)) return 0;

    return nodes.reduce((acc, node) => {
        if (node.text !== undefined) return acc + node.text.length;
        if (node.children) return acc + getTextLength(node.children);
        return acc;
    }, 0);
}
