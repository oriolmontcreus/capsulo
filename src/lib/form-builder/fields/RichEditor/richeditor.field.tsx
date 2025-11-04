'use client';

import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import type { RichEditorField as RichEditorFieldType } from './richeditor.types';
import { Field, FieldDescription, FieldError } from '@/components/ui/field';
import { FieldLabel } from '../../components/FieldLabel';
import { cn } from '@/lib/utils';
import { Plate, usePlateEditor } from 'platejs/react';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { discussionPlugin } from '@/components/discussion-kit';
import { suggestionPlugin } from '@/components/suggestion-kit';
import { useAuthContext } from '@/components/admin/AuthProvider';
import { useEditorPlugins } from './use-editor-plugins';
import { createDynamicFixedToolbarKit, createDynamicFloatingToolbarKit } from './dynamic-toolbar-kit';

//TODO: IMPLEMENT IMAGE AND FILE UPLOADS
interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

interface RichEditorFieldProps {
    field: RichEditorFieldType;
    value: any;
    onChange: (value: any) => void;
    error?: string;
    fieldPath?: string;
    componentData?: ComponentData;
    formData?: Record<string, any>;
}

// Calculate character count for display (memoized outside component)
const getTextLength = (nodes: any[]): number => {
    if (!nodes) return 0;
    return nodes.reduce((acc, node) => {
        if (node.text !== undefined) return acc + node.text.length;
        if (node.children) return acc + getTextLength(node.children);
        return acc;
    }, 0);
};

// Memoized editor wrapper to prevent re-renders
const MemoizedPlateEditor = React.memo<{
    editor: any;
    onChange: (data: { value: any }) => void;
    variant?: any;
    placeholder?: string;
    error?: boolean;
}>(({ editor, onChange, variant, placeholder, error }) => {
    return (
        <Plate editor={editor} onChange={onChange}>
            <EditorContainer variant={variant}>
                <Editor
                    variant={variant}
                    placeholder={placeholder}
                    aria-invalid={error}
                />
            </EditorContainer>
        </Plate>
    );
}, (prev, next) => {
    // Only re-render if variant, placeholder, or error changes
    // Don't re-render on editor or onChange changes
    return (
        prev.variant === next.variant &&
        prev.placeholder === next.placeholder &&
        prev.error === next.error
    );
});

MemoizedPlateEditor.displayName = 'MemoizedPlateEditor';

export const RichEditorField: React.FC<RichEditorFieldProps> = React.memo(({
    field,
    value,
    onChange,
    error,
    fieldPath,
    componentData,
    formData
}) => {
    // Get authenticated user if available
    const auth = useAuthContext();
    const user = auth?.user;

    // Load plugins dynamically based on field configuration
    const { plugins, enabledFeatures, isLoading: isLoadingPlugins, error: pluginError } = useEditorPlugins({
        features: field.features,
        disableFeatures: field.disableFeatures,
        disableAllFeatures: field.disableAllFeatures,
        enableAllFeatures: field.enableAllFeatures,
        // Legacy support
        toolbarButtons: field.toolbarButtons,
        disableToolbarButtons: field.disableToolbarButtons,
        disableAllToolbarButtons: field.disableAllToolbarButtons,
    });

    // Add dynamic toolbars based on enabled features
    const allPlugins = useMemo(() => {
        if (!plugins) return [];

        const hasFixedToolbar = enabledFeatures.includes('fixedToolbar');
        const hasFloatingToolbar = enabledFeatures.includes('floatingToolbar');

        const toolbarPlugins = [];

        if (hasFixedToolbar) {
            toolbarPlugins.push(...createDynamicFixedToolbarKit(enabledFeatures));
        }

        if (hasFloatingToolbar) {
            toolbarPlugins.push(...createDynamicFloatingToolbarKit(enabledFeatures));
        }

        return [...plugins, ...toolbarPlugins];
    }, [plugins, enabledFeatures]);

    // Prepare editor override options for authenticated user
    const editorOverrides = useMemo(() => {
        if (!user) {
            return {};
        }

        // Extract discussions from value if they exist
        const discussions = (value && typeof value === 'object' && 'discussions' in value)
            ? value.discussions
            : [];

        return {
            plugins: {
                [discussionPlugin.key]: {
                    options: {
                        currentUserId: user.login,
                        discussions: discussions,
                        users: {
                            [user.login]: {
                                id: user.login,
                                avatarUrl: user.avatar_url,
                                name: user.name || user.login,
                            },
                        },
                    },
                },
                [suggestionPlugin.key]: {
                    options: {
                        currentUserId: user.login,
                    },
                },
            },
        };
    }, [user, value]);

    // Create editor only once plugins are loaded
    const editor = usePlateEditor(
        {
            plugins: allPlugins || [],
            override: editorOverrides,
            value: (value && typeof value === 'object' && 'content' in value)
                ? value.content
                : (value || [
                    {
                        type: 'p',
                        children: [{ text: '' }],
                    },
                ]),
        },
        [allPlugins, editorOverrides] // Recreate when plugins load or overrides change
    );

    // Debounce onChange to prevent excessive parent updates
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const handleChange = useCallback(
        ({ value: newValue }: { value: any }) => {
            // Clear existing timer
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            // Debounce the onChange call - increased to reduce parent re-renders
            debounceTimerRef.current = setTimeout(() => {
                // Get discussions data from editor
                const discussions = editor?.getOption(discussionPlugin, 'discussions') || [];

                // Save both content and discussions
                onChange({
                    content: newValue,
                    discussions: discussions,
                });
            }, 500); // Increased from 300ms to 500ms
        },
        [onChange, editor]
    );

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // Memoize text length calculation
    const textLength = useMemo(() => {
        const content = (value && typeof value === 'object' && 'content' in value)
            ? value.content
            : value;
        return getTextLength(content || []);
    }, [value]);

    // Show loading state while plugins are loading
    if (isLoadingPlugins) {
        return (
            <Field data-invalid={!!error}>
                <div className="flex justify-between items-center mb-2">
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
                </div>
                <div className={cn("rounded-md border p-4", error && "border-destructive")}>
                    <div className="flex items-center justify-center text-sm text-muted-foreground">
                        Loading editor...
                    </div>
                </div>
                {field.description && (
                    <FieldDescription>{field.description}</FieldDescription>
                )}
            </Field>
        );
    }

    // Show error state if plugins failed to load
    if (pluginError) {
        return (
            <Field data-invalid={true}>
                <div className="flex justify-between items-center mb-2">
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
                </div>
                <div className="rounded-md border border-destructive p-4">
                    <div className="flex items-center justify-center text-sm text-destructive">
                        Failed to load editor: {pluginError.message}
                    </div>
                </div>
            </Field>
        );
    }

    return (
        <Field data-invalid={!!error}>
            <div className="flex justify-between items-center mb-2">
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
                {field.maxLength && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {textLength} / {field.maxLength}
                    </span>
                )}
            </div>

            <div className={cn("rounded-md border", error && "border-destructive")}>
                <MemoizedPlateEditor
                    editor={editor}
                    onChange={handleChange}
                    variant={field.variant}
                    placeholder={field.placeholder}
                    error={!!error}
                />
            </div>

            {error ? (
                <FieldError>{error}</FieldError>
            ) : field.description ? (
                <FieldDescription>{field.description}</FieldDescription>
            ) : null}
        </Field>
    );
}, (prevProps, nextProps) => {
    // Custom comparison: only re-render if these specific values changed
    return (
        prevProps.value === nextProps.value &&
        prevProps.error === nextProps.error &&
        prevProps.field.name === nextProps.field.name &&
        prevProps.field.label === nextProps.field.label &&
        prevProps.field.variant === nextProps.field.variant &&
        prevProps.field.maxLength === nextProps.field.maxLength &&
        prevProps.field.features === nextProps.field.features &&
        prevProps.field.disableFeatures === nextProps.field.disableFeatures &&
        prevProps.field.disableAllFeatures === nextProps.field.disableAllFeatures &&
        prevProps.field.enableAllFeatures === nextProps.field.enableAllFeatures &&
        // Legacy support
        prevProps.field.toolbarButtons === nextProps.field.toolbarButtons &&
        prevProps.field.disableToolbarButtons === nextProps.field.disableToolbarButtons &&
        prevProps.field.disableAllToolbarButtons === nextProps.field.disableAllToolbarButtons
    );
});

RichEditorField.displayName = 'RichEditorField';
