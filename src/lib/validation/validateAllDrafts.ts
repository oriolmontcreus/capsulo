/**
 * Validation utility for CMS drafts
 * 
 * Validates all pages and globals drafts from localStorage before committing.
 * Returns validation errors compatible with ValidationContext.
 */

import { getAllSchemas, getAllGlobalSchemas } from '@/lib/form-builder';
import type { ComponentData, PageData, Schema } from '@/lib/form-builder';
import { flattenFields } from '@/lib/form-builder/core/fieldHelpers';
import { fieldToZod } from '@/lib/form-builder/fields/ZodRegistry';
import { getChangedPageIds, getPageDraft, getGlobalsDraft } from '@/lib/cms-local-changes';
import type { ValidationError } from '@/lib/form-builder/context/ValidationContext';
import config from '@/capsulo.config';

export interface ValidationResult {
    isValid: boolean;
    errors: Record<string, Record<string, string>>;
    errorList: ValidationError[];
}

/**
 * Validates components against their schemas
 */
function validateComponents(
    components: ComponentData[],
    schemas: Schema[],
    defaultLocale: string,
    pageId: string
): { errors: Record<string, Record<string, string>>; errorList: ValidationError[] } {
    const errors: Record<string, Record<string, string>> = {};
    const errorList: ValidationError[] = [];

    components.forEach(component => {
        const schema = schemas.find(s => s.name === component.schemaName || s.key === component.schemaName);
        if (!schema) return;

        const componentErrors: Record<string, string> = {};
        const dataFields = flattenFields(schema.fields);

        // Prepare raw form data for validation context (needed for conditional validation)
        const formDataForValidation = Object.entries(component.data).reduce(
            (acc, [key, field]) => {
                acc[key] = field?.value;
                return acc;
            },
            {} as Record<string, any>
        );

        dataFields.forEach(field => {
            // Get the value from component data
            let value = component.data[field.name]?.value;

            // Handle translation format where value can be an object with locale keys
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                // Check if this looks like a locale-keyed object
                const keys = Object.keys(value);
                const locales = config.i18n?.locales || ['en'];
                const isLocaleObject = keys.some(k => locales.includes(k));
                if (isLocaleObject) value = value[defaultLocale];
            }

            // Create zod schema for validation
            const zodSchema = fieldToZod(field, formDataForValidation);
            const result = zodSchema.safeParse(value);

            if (!result.success) {
                result.error.errors.forEach(issue => {
                    const pathParts = [field.name, ...issue.path];
                    const path = pathParts.join('.');
                    componentErrors[path] = issue.message;

                    // Check if this is a repeater field error (pattern: fieldName.index.nestedField)
                    // Example: "cards.0.email" -> repeaterFieldName: "cards", repeaterItemIndex: 0
                    let repeaterFieldName: string | undefined;
                    let repeaterItemIndex: number | undefined;

                    if (issue.path.length >= 1) {
                        // First element of issue.path is the array index for repeater fields
                        const maybeIndex = issue.path[0];
                        if (typeof maybeIndex === 'number') {
                            repeaterFieldName = field.name;
                            repeaterItemIndex = maybeIndex;
                        }
                    }

                    // Build detailed error info for the sidebar
                    const fieldLabel = 'label' in field && field.label ? String(field.label) : field.name;
                    errorList.push({
                        componentId: component.id,
                        componentName: component.alias || component.schemaName,
                        fieldPath: path,
                        fieldLabel: fieldLabel,
                        tabName: undefined,
                        tabIndex: undefined,
                        message: issue.message,
                        pageId: pageId,
                        repeaterFieldName,
                        repeaterItemIndex,
                    });
                });
            }
        });

        if (Object.keys(componentErrors).length > 0) {
            errors[component.id] = componentErrors;
        }
    });

    return { errors, errorList };
}

/**
 * Validates all drafts (pages and globals) from localStorage
 * 
 * @returns ValidationResult with isValid flag, errors map, and error list
 */
export function validateAllDrafts(): ValidationResult {
    const defaultLocale = config.i18n?.defaultLocale || 'en';
    const allSchemas = getAllSchemas();
    const globalSchemas = getAllGlobalSchemas();

    let allErrors: Record<string, Record<string, string>> = {};
    let allErrorList: ValidationError[] = [];

    // Validate all changed pages
    const changedPageIds = getChangedPageIds();

    for (const pageId of changedPageIds) {
        const pageDraft = getPageDraft(pageId);
        if (pageDraft && pageDraft.components.length > 0) {
            const { errors, errorList } = validateComponents(
                pageDraft.components,
                allSchemas,
                defaultLocale,
                pageId
            );
            allErrors = { ...allErrors, ...errors };
            allErrorList = [...allErrorList, ...errorList];
        }
    }

    // Validate globals draft
    const globalsDraft = getGlobalsDraft();
    if (globalsDraft && globalsDraft.variables.length > 0) {
        const { errors, errorList } = validateComponents(
            globalsDraft.variables,
            globalSchemas,
            defaultLocale,
            'globals'
        );
        allErrors = { ...allErrors, ...errors };
        allErrorList = [...allErrorList, ...errorList];
    }

    return {
        isValid: allErrorList.length === 0,
        errors: allErrors,
        errorList: allErrorList,
    };
}

/**
 * Validates a single page's draft data
 */
export function validatePageDraft(pageId: string, pageData: PageData): ValidationResult {
    const defaultLocale = config.i18n?.defaultLocale || 'en';
    const allSchemas = getAllSchemas();

    const { errors, errorList } = validateComponents(
        pageData.components,
        allSchemas,
        defaultLocale,
        pageId
    );

    return {
        isValid: errorList.length === 0,
        errors,
        errorList,
    };
}
