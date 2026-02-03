import React from 'react';
import type { Field } from '../core/types';
import { useTranslationOptional } from '../context/TranslationContext';
import { useTranslationDataOptional } from '../context/TranslationDataContext';

interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

interface FieldRendererProps {
    field: Field;
    value: any;
    onChange: (value: any) => void;
    error?: string;
    fieldErrors?: Record<string, string>;
    fieldPath?: string;
    componentData?: ComponentData;
    formData?: Record<string, any>;
    highlightedField?: string;
    highlightRequestId?: number;
}

// This will be set by FieldRegistry to avoid circular dependency
let getFieldComponentFn: ((type: string) => React.ComponentType<any> | null) | null = null;

export const setFieldComponentGetter = (fn: (type: string) => React.ComponentType<any> | null) => {
    getFieldComponentFn = fn;
};

/**
 * Central field renderer that maps field types to their components.
 * This is used by layout components to render nested fields without circular dependencies.
 * Uses the FieldRegistry for O(1) lookup performance.
 * Memoized to prevent unnecessary re-renders when parent re-renders.
 * Enhanced with translation support for translatable fields.
 */
const FieldRendererComponent: React.FC<FieldRendererProps> = ({ field, value, onChange, error, fieldErrors, fieldPath, componentData, formData, highlightedField, highlightRequestId }) => {
    // Get translation context for focus-based activation
    const translationContext = useTranslationOptional();
    const translationDataContext = useTranslationDataOptional();

    // Memoize isTranslatable based on stable primitive value
    const isTranslatable = React.useMemo(
        () => 'translatable' in field && (field as any).translatable === true,
        [(field as any).translatable]
    );

    // Use refs to avoid recreating callback when object references change
    const componentDataRef = React.useRef(componentData);
    const formDataRef = React.useRef(formData);

    // Keep refs up to date
    React.useEffect(() => {
        componentDataRef.current = componentData;
        formDataRef.current = formData;
    }, [componentData, formData]);

    // Handle focus event to update translation sidebar
    const handleFieldFocus = React.useCallback((e: React.FocusEvent) => {
        // Stop propagation to prevent parent non-translatable wrappers from clearing the field
        e.stopPropagation();

        if (!translationContext || !fieldPath) return;

        // Only trigger for translatable fields
        if (!isTranslatable) return;

        // Set the current component data for translation
        if (translationDataContext && componentDataRef.current && formDataRef.current) {
            translationDataContext.setCurrentComponent(componentDataRef.current);
            translationDataContext.setCurrentFormData(formDataRef.current);
        }

        // Set this field as the active translation field
        translationContext.setActiveField(fieldPath);
    }, [translationContext, translationDataContext, fieldPath, isTranslatable]);

    // Handle focus on non-translatable fields to clear the translation sidebar
    const handleNonTranslatableFocus = React.useCallback((e: React.FocusEvent) => {
        // Stop propagation to prevent multiple handlers from firing
        e.stopPropagation();

        if (!translationContext) return;

        // Clear the active translation field to reset sidebar to default state
        translationContext.setActiveField(null);
    }, [translationContext]);

    if (!getFieldComponentFn) {
        console.error('FieldRenderer: getFieldComponent not initialized. Did you forget to import FieldRegistry?');
        return null;
    }

    if (field.hidden) {
        const isHidden = typeof field.hidden === 'function'
            ? field.hidden(formData || {})
            : field.hidden;

        if (isHidden) return null;
    }

    const FieldComponent = getFieldComponentFn(field.type);

    if (!FieldComponent) {
        console.warn(`No component registered for field type: ${field.type}`);
        return null;
    }

    const hasMultipleLocales = (translationContext?.availableLocales?.length ?? 0) > 1;

    // Only wrap with focus handlers when translation context is available and has multiple locales
    // This reduces DOM overhead for single-locale scenarios
    if (hasMultipleLocales) {
        if (isTranslatable) {
            // Wrap translatable fields to capture focus for translation sidebar
            return (
                <fieldset
                    className="min-w-0 border-0 p-0 m-0"
                    onFocus={handleFieldFocus}
                >
                    <legend className="sr-only">{(field as any).label || (field as any).name || 'Field'}</legend>
                    <FieldComponent
                        field={field}
                        value={value}
                        onChange={onChange}
                        error={error}
                        fieldErrors={fieldErrors}
                        fieldPath={fieldPath}
                        componentData={componentData}
                        formData={formData}
                        highlightedField={highlightedField}
                        highlightRequestId={highlightRequestId}
                    />
                </fieldset>
            );
        }

        // For non-translatable fields with multiple locales, wrap to clear translation sidebar on focus
        return (
            <fieldset
                className="min-w-0 border-0 p-0 m-0"
                onFocus={handleNonTranslatableFocus}
            >
                <legend className="sr-only">{(field as any).label || (field as any).name || 'Field'}</legend>
                <FieldComponent
                    field={field}
                    value={value}
                    onChange={onChange}
                    error={error}
                    fieldErrors={fieldErrors}
                    fieldPath={fieldPath}
                    componentData={componentData}
                    formData={formData}
                    highlightedField={highlightedField}
                    highlightRequestId={highlightRequestId}
                />
            </fieldset>
        );
    }

    // Single locale or no translation context: render without wrapper for better performance
    return (
        <FieldComponent
            field={field}
            value={value}
            onChange={onChange}
            error={error}
            fieldErrors={fieldErrors}
            fieldPath={fieldPath}
            componentData={componentData}
            formData={formData}
            highlightedField={highlightedField}
            highlightRequestId={highlightRequestId}
        />
    );
};

export const FieldRenderer = React.memo(FieldRendererComponent);
