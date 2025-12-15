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
    const handleFieldFocus = React.useCallback(() => {
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


    // Wrap with focus capture for translatable fields
    if (isTranslatable && (translationContext?.availableLocales?.length ?? 0) > 1) {
        return (
            <div
                role="group"
                aria-label={(field as any).label || (field as any).name || 'Field'}
                onFocus={handleFieldFocus}
            >
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
            </div>
        );
    }

    // Pass fieldPath to field components so they can handle translation icons internally
    // Also pass highlightedField for layout components that need it
    return <FieldComponent
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
    />;
};

export const FieldRenderer = React.memo(FieldRendererComponent);
