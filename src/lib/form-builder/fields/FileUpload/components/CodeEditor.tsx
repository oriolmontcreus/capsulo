import React, { useEffect, useRef } from 'react';
import {
    EditorView,
    lineNumbers,
    highlightActiveLineGutter,
    highlightSpecialChars,
    drawSelection,
    keymap
} from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { xml } from '@codemirror/lang-xml';
import { oneDark } from '@codemirror/theme-one-dark';
import { vscodeLightInit } from '@uiw/codemirror-theme-vscode';
import {
    foldGutter,
    indentOnInput,
    syntaxHighlighting,
    defaultHighlightStyle,
    bracketMatching,
    foldKeymap
} from '@codemirror/language';
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { cn } from '@/lib/utils';

interface CodeEditorProps {
    value: string;
    onChange: (value: string) => void;
    hasError?: boolean;
}

// Extract VS Code Light theme configuration
const createVscodeLightTheme = () => vscodeLightInit({
    settings: {
        background: '#ffffff',
        foreground: '#000000',
        caret: '#000000',
        selection: '#add6ff',
        selectionMatch: '#add6ff',
        lineHighlight: '#f0f0f0',
    }
});

// Extract editor extensions setup
const createCustomSetup = () => [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    closeBrackets(),
    highlightSelectionMatches(),
    keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
    ]),
];

// Extract editor theme styling
const editorTheme = EditorView.theme({
    '&': {
        height: '100%',
        fontSize: '14px',
    },
    '.cm-scroller': {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        overflowX: 'auto',
    },
    // Remove the gray line highlight
    '.cm-activeLine': {
        backgroundColor: 'transparent',
    },
    '.cm-activeLineGutter': {
        backgroundColor: 'transparent',
    },
});

// Extract wheel event handler for horizontal scrolling
const wheelHandler = EditorView.domEventHandlers({
    wheel(event, view) {
        if (event.shiftKey) {
            const scroller = view.scrollDOM;
            scroller.scrollLeft += event.deltaY;
            event.preventDefault();
            return true;
        }
        return false;
    }
});

// Create editor state with all extensions
const createEditorState = (doc: string, isDark: boolean, onChange: (value: string) => void) => {
    const vscodeLight = createVscodeLightTheme();
    return EditorState.create({
        doc,
        extensions: [
            createCustomSetup(),
            xml(),
            isDark ? oneDark : vscodeLight,
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    onChange(update.state.doc.toString());
                }
            }),
            editorTheme,
            wheelHandler,
        ],
    });
};

export const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, hasError }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const isDarkRef = useRef(false);

    useEffect(() => {
        if (!editorRef.current) return;

        // Check if dark mode
        const checkDarkMode = () => {
            return document.documentElement.classList.contains('dark');
        };

        isDarkRef.current = checkDarkMode();

        // Create editor with initial state
        const startState = createEditorState(value, isDarkRef.current, onChange);

        const view = new EditorView({
            state: startState,
            parent: editorRef.current,
        });

        viewRef.current = view;

        // Watch for theme changes
        const observer = new MutationObserver(() => {
            const isDark = checkDarkMode();
            if (isDark !== isDarkRef.current) {
                isDarkRef.current = isDark;

                const currentView = viewRef.current;
                if (!currentView) return;

                // Recreate editor with new theme
                const currentValue = currentView.state.doc.toString();
                currentView.destroy();

                const newState = createEditorState(currentValue, isDark, onChange);

                const newView = new EditorView({
                    state: newState,
                    parent: editorRef.current!,
                });

                viewRef.current = newView;
            }
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => {
            observer.disconnect();
            if (viewRef.current) {
                viewRef.current.destroy();
                viewRef.current = null;
            }
        };
    }, []); // Only run once on mount

    // Update editor content when value prop changes externally
    useEffect(() => {
        if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
            viewRef.current.dispatch({
                changes: {
                    from: 0,
                    to: viewRef.current.state.doc.length,
                    insert: value,
                },
            });
        }
    }, [value]);

    return (
        <div
            ref={editorRef}
            className={cn(
                'h-full overflow-hidden rounded-md border',
                hasError && 'ring-2 ring-destructive'
            )}
        />
    );
};
