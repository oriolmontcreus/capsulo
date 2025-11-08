import React, { useEffect, useRef } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { xml } from '@codemirror/lang-xml';
import { oneDark } from '@codemirror/theme-one-dark';
import { vscodeLightInit } from '@uiw/codemirror-theme-vscode';
import { basicSetup } from 'codemirror';
import { cn } from '@/lib/utils';

interface CodeEditorProps {
    value: string;
    onChange: (value: string) => void;
    hasError?: boolean;
}

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

        // VS Code Light theme with better contrast
        const vscodeLight = vscodeLightInit({
            settings: {
                background: '#ffffff',
                foreground: '#000000',
                caret: '#000000',
                selection: '#add6ff',
                selectionMatch: '#add6ff',
                lineHighlight: '#f0f0f0',
            }
        });

        // Create editor
        const startState = EditorState.create({
            doc: value,
            extensions: [
                basicSetup,
                xml(),
                isDarkRef.current ? oneDark : vscodeLight,
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        onChange(update.state.doc.toString());
                    }
                }),
                EditorView.theme({
                    '&': {
                        height: '100%',
                        fontSize: '14px',
                    },
                    '.cm-scroller': {
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        overflowX: 'auto',
                    },
                }),
                // Enable horizontal scroll with Shift+Wheel
                EditorView.domEventHandlers({
                    wheel(event, view) {
                        if (event.shiftKey) {
                            const scroller = view.scrollDOM;
                            scroller.scrollLeft += event.deltaY;
                            event.preventDefault();
                            return true;
                        }
                        return false;
                    }
                }),
            ],
        });

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

                // Recreate editor with new theme
                const currentValue = view.state.doc.toString();
                view.destroy();

                // VS Code Light theme with better contrast
                const vscodeLight = vscodeLightInit({
                    settings: {
                        background: '#ffffff',
                        foreground: '#000000',
                        caret: '#000000',
                        selection: '#add6ff',
                        selectionMatch: '#add6ff',
                        lineHighlight: '#f0f0f0',
                    }
                });

                const newState = EditorState.create({
                    doc: currentValue,
                    extensions: [
                        basicSetup,
                        xml(),
                        isDark ? oneDark : vscodeLight,
                        EditorView.updateListener.of((update) => {
                            if (update.docChanged) {
                                onChange(update.state.doc.toString());
                            }
                        }),
                        EditorView.theme({
                            '&': {
                                height: '100%',
                                fontSize: '14px',
                            },
                            '.cm-scroller': {
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                overflowX: 'auto',
                            },
                        }),
                        // Enable horizontal scroll with Shift+Wheel
                        EditorView.domEventHandlers({
                            wheel(event, view) {
                                if (event.shiftKey) {
                                    const scroller = view.scrollDOM;
                                    scroller.scrollLeft += event.deltaY;
                                    event.preventDefault();
                                    return true;
                                }
                                return false;
                            }
                        }),
                    ],
                });

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
            view.destroy();
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
