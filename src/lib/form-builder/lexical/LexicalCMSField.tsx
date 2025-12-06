import React, { useEffect, useRef, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $createParagraphNode, $createTextNode } from 'lexical';
import type { EditorState } from 'lexical';
import { VariableNode, $createVariableNode } from './nodes/VariableNode';
import { cn } from '@/lib/utils';
import { GlobalVariableSelect } from '../components/GlobalVariableSelect';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';

// Helper to initialize state from string
function $initialEditorState(value: string) {
    const root = $getRoot();
    if (root.getFirstChild()) return;

    const p = $createParagraphNode();

    // Parse value for {{variables}}
    const parts = value.split(/(\{\{[^}]+\}\})/g);

    parts.forEach(part => {
        const match = part.match(/^\{\{([^}]+)\}\}$/);
        if (match) {
            p.append($createVariableNode(match[1]));
        } else if (part) {
            p.append($createTextNode(part));
        }
    });

    root.append(p);
}

interface LexicalCMSFieldProps {
    value: string;
    onChange: (val: string) => void;
    multiline?: boolean;
    className?: string; // Wrapper class
    inputClassName?: string; // Editable class
    placeholder?: string;
    id?: string;
}

export const LexicalCMSField: React.FC<LexicalCMSFieldProps> = ({
    value,
    onChange,
    multiline = false,
    className,
    inputClassName,
    placeholder,
    id
}) => {
    // We need to sync external value prop to editor state ONLY on mount or reset?
    // Lexical is generally uncontrolled. If we sync completely it resets cursor.
    // We assume this component is the source of truth while mounting?
    // We'll use an initial config.

    const initialConfig = {
        namespace: 'CMSField',
        theme: {
            paragraph: 'mb-1',
            text: {
                bold: 'font-bold',
                italic: 'italic',
            }
        },
        onError: (e: Error) => console.error(e),
        nodes: [VariableNode]
    };

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <EditorInner
                value={value}
                onChange={onChange}
                multiline={multiline}
                className={className}
                inputClassName={inputClassName}
                placeholder={placeholder}
                id={id}
            />
        </LexicalComposer>
    );
};

const EditorInner: React.FC<LexicalCMSFieldProps & { value: string }> = ({
    value,
    onChange,
    multiline,
    className,
    inputClassName,
    placeholder,
    id
}) => {
    const [editor] = useLexicalComposerContext();
    const [showGlobalSelect, setShowGlobalSelect] = useState(false);

    // Sync value from props to editor
    useEffect(() => {
        editor.update(() => {
            const root = $getRoot();
            const currentText = root.getTextContent();

            // If editor is empty but we have a value, initialize it (Data Loaded case)
            if (currentText === '' && value) {
                // Clear just in case (though it should be empty/default paragraph)
                root.clear();
                $initialEditorState(value);
            }
        });
    }, [editor, value]);

    const handleOnChange = (editorState: EditorState) => {
        editorState.read(() => {
            const textContent = $getRoot().getTextContent();
            onChange(textContent);
        });
    };

    // State for autocomplete
    const [searchQuery, setSearchQuery] = useState('');

    // Handle trigger from plugin
    const handleAutocomplete = (query: string | null) => {
        if (query !== null) {
            setSearchQuery(query);
            setShowGlobalSelect(true);
        } else {
            setShowGlobalSelect(false);
            setSearchQuery('');
        }
    };

    // Handle Variable selection
    const handleVariableSelect = (key: string) => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection) && selection.isCollapsed()) {
                const anchor = selection.anchor;
                const node = anchor.getNode();

                if (node instanceof TextNode) {
                    const text = node.getTextContent();
                    const offset = anchor.offset;
                    const textBefore = text.slice(0, offset);

                    // Find the trigger including the query we typed
                    const match = textBefore.match(/\{\{([a-zA-Z0-9_]*)$/);

                    if (match) {
                        const matchLength = match[0].length; // "{{query" length

                        // Delete the trigger text "{{query"
                        // We delete backwards from current position
                        node.spliceText(offset - matchLength, matchLength, '');

                        // Insert the VariableNode
                        const varNode = $createVariableNode(key);
                        selection.insertNodes([varNode]);

                        // Add a space after for convenience? Optional.
                        // selection.insertText(' '); 
                    }
                }
            }
        });

        // Close popover
        setShowGlobalSelect(false);
        setSearchQuery('');
    };

    return (
        <div className={cn("relative w-full", className)}>
            {/* We wrap the content editable with logic to trigger popup */}
            <GlobalVariableTrigger
                show={showGlobalSelect}
                setShow={setShowGlobalSelect}
                onSelect={handleVariableSelect}
                searchQuery={searchQuery}
            >
                <div className={cn(
                    "relative w-full rounded-md border border-input shadow-xs transition-[color,box-shadow] focus-within:ring-ring/50 focus-within:ring-[3px]",
                    multiline ? "min-h-[80px]" : "h-9 flex items-center",
                    className
                )}>
                    <RichTextPlugin
                        contentEditable={
                            <ContentEditable
                                className={cn(
                                    "w-full h-full px-3 py-1 text-sm outline-none bg-transparent",
                                    multiline ? "align-top" : "overflow-hidden whitespace-nowrap",
                                    inputClassName
                                )}
                                id={id}
                            />
                        }
                        placeholder={
                            placeholder ? <div className="absolute top-2 left-3 text-sm text-muted-foreground pointer-events-none select-none">{placeholder}</div> : null
                        }
                        ErrorBoundary={LexicalErrorBoundary}
                    />
                    <HistoryPlugin />
                    <OnChangePlugin onChange={handleOnChange} />
                    <AutocompletePlugin onTrigger={handleAutocomplete} />
                </div>
            </GlobalVariableTrigger>
        </div>
    );
};

// Plugin to detect "{{query"
import { $getSelection, $isRangeSelection, TextNode } from 'lexical';

function AutocompletePlugin({ onTrigger }: { onTrigger: (query: string | null) => void }) {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                const selection = $getSelection();

                if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
                    onTrigger(null);
                    return;
                }

                const node = selection.anchor.getNode();
                if (!(node instanceof TextNode)) {
                    onTrigger(null);
                    return;
                }

                const offset = selection.anchor.offset;
                const textOriginal = node.getTextContent();
                const textBefore = textOriginal.slice(0, offset);

                // Regex to match "{{" followed by optional alphanumeric characters at the end of the string
                // We limit the lookback to reasonable length (e.g. 50 chars) to avoid false positives far back? 
                // Actually JS regex is greedy, but we anchor to end $.
                const match = textBefore.match(/\{\{([a-zA-Z0-9_]*)$/);

                if (match) {
                    onTrigger(match[1]);
                } else {
                    onTrigger(null);
                }
            });
        });
    }, [editor, onTrigger]);

    return null;
}

// Wrapper for GlobalVariableSelect to handle insertion
const GlobalVariableTrigger = ({
    show, setShow, onSelect, searchQuery, children
}: {
    show: boolean,
    setShow: (v: boolean) => void,
    onSelect: (key: string) => void,
    searchQuery: string,
    children: React.ReactNode
}) => {
    return (
        <GlobalVariableSelect
            open={show}
            onOpenChange={setShow}
            onSelect={onSelect}
            searchQuery={searchQuery}
        >
            {children}
        </GlobalVariableSelect>
    );
};
