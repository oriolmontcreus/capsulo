import { useMemo } from 'react';
import { createEditor } from 'lexical';
import { $generateHtmlFromNodes } from '@lexical/html';
import type { SerializedEditorState } from 'lexical';

import { nodes } from './nodes';
import { editorTheme } from '@/components/editor/themes/editor-theme';

interface EditorRendererProps {
    editorState?: SerializedEditorState | null;
    className?: string;
    fallback?: string;
}

export function EditorRenderer({
    editorState,
    className = '',
    fallback = ''
}: EditorRendererProps) {
    const htmlContent = useMemo(() => {
        if (!editorState) {
            return fallback;
        }

        try {
            // Create a headless editor instance
            const editor = createEditor({
                namespace: 'EditorRenderer',
                theme: editorTheme,
                nodes,
                onError: (error: Error) => {
                    console.error('Editor renderer error:', error);
                },
            });

            // Set the editor state and generate HTML
            const editorStateObj = editor.parseEditorState(JSON.stringify(editorState));
            editor.setEditorState(editorStateObj);

            let html = '';
            editor.update(() => {
                html = $generateHtmlFromNodes(editor, null);
            });

            return html || fallback;
        } catch (error) {
            console.error('Failed to render editor content:', error);
            return fallback;
        }
    }, [editorState, fallback]);

    if (!htmlContent) {
        return null;
    }

    return (
        <div
            className={className}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
    );
}