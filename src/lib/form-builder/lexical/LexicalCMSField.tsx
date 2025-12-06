import React, { useEffect, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    $getRoot,
    $createParagraphNode,
    $createTextNode,
    $getSelection,
    $isRangeSelection,
    TextNode,
    KEY_ARROW_DOWN_COMMAND,
    KEY_ARROW_UP_COMMAND,
    KEY_ENTER_COMMAND,
    COMMAND_PRIORITY_NORMAL,
    type EditorState
} from 'lexical';
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

// Helper to fetch variables
const useGlobalVariables = () => {
    const [variables, setVariables] = useState<string[]>([]);

    useEffect(() => {
        const fetchVariables = async () => {
            try {
                const response = await fetch('/api/cms/globals/load');
                if (response.ok) {
                    const data = await response.json();
                    const globals = data.variables?.find((v: any) => v.id === 'globals');
                    if (globals && globals.data) {
                        setVariables(Object.keys(globals.data));
                    }
                }
            } catch (error) {
                console.error('Failed to load global variables', error);
            }
        };
        fetchVariables();
    }, []);

    return variables;
};

// Plugin to detect "{{query"
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

// Plugin to handle keyboard nav
function KeyboardNavigationPlugin({
    itemsCount,
    selectedIndex,
    setSelectedIndex,
    onSelect
}: {
    itemsCount: number,
    selectedIndex: number,
    setSelectedIndex: (i: number) => void,
    onSelect: () => void
}) {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return editor.registerCommand(
            KEY_ARROW_DOWN_COMMAND,
            (event) => {
                if (event) event.preventDefault();
                setSelectedIndex(Math.min(selectedIndex + 1, itemsCount - 1));
                return true;
            },
            COMMAND_PRIORITY_NORMAL
        );
    }, [editor, selectedIndex, itemsCount, setSelectedIndex]);

    useEffect(() => {
        return editor.registerCommand(
            KEY_ARROW_UP_COMMAND,
            (event) => {
                if (event) event.preventDefault();
                setSelectedIndex(Math.max(selectedIndex - 1, 0));
                return true;
            },
            COMMAND_PRIORITY_NORMAL
        );
    }, [editor, selectedIndex, setSelectedIndex]);

    useEffect(() => {
        return editor.registerCommand(
            KEY_ENTER_COMMAND,
            (event) => {
                // If menu is open, select current
                if (event) event.preventDefault();
                onSelect();
                return true;
            },
            COMMAND_PRIORITY_NORMAL
        );
    }, [editor, onSelect]);

    return null;
}

interface LexicalCMSFieldProps {
    value: string;
    onChange: (val: string) => void;
    multiline?: boolean;
    className?: string; // Wrapper class
    inputClassName?: string; // Editable class
    placeholder?: string;
    id?: string;
    autoResize?: boolean;
    rows?: number;
    minRows?: number;
    maxRows?: number;
}

const EditorInner: React.FC<LexicalCMSFieldProps & { value: string }> = ({
    value,
    onChange,
    multiline,
    className,
    inputClassName,
    placeholder,
    id,
    autoResize = true,
    rows,
    minRows,
    maxRows
}) => {
    const [editor] = useLexicalComposerContext();
    const [showGlobalSelect, setShowGlobalSelect] = useState(false);

    // Calculate styles based on props
    const contentStyle = React.useMemo(() => {
        if (!multiline) return {};

        const lineHeight = 24; // Approximation
        const styles: React.CSSProperties = {};

        if (!autoResize) {
            // Fixed height
            const numRows = rows || 3;
            styles.height = `${numRows * lineHeight}px`;
            styles.overflowY = 'auto'; // Enable scroll
        } else {
            // Auto resize with bounds
            if (minRows) styles.minHeight = `${minRows * lineHeight}px`;
            if (maxRows) styles.maxHeight = `${maxRows * lineHeight}px`;
            // If maxRows is hit, it naturally scrolls if we don't hide overflow. 
            // ContentEditable handles this if we constrain the parent.
            styles.overflowY = 'auto';
        }

        return styles;
    }, [multiline, autoResize, rows, minRows, maxRows]);

    // State for autocomplete
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Fetch variables
    const variables = useGlobalVariables();

    // Compute filtered variables
    const filteredVariables = React.useMemo(() => {
        if (!searchQuery) return variables;
        const lowerQuery = searchQuery.toLowerCase();
        return variables.filter(v => v.toLowerCase().includes(lowerQuery));
    }, [variables, searchQuery]);

    const itemsCount = filteredVariables.length;

    // Sync value from props to editor
    useEffect(() => {
        editor.update(() => {
            const root = $getRoot();
            const currentText = root.getTextContent();

            // If editor is empty but we have a value, initialize it (Data Loaded case)
            if (currentText === '' && value) {
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

    const handleAutocomplete = (query: string | null) => {
        if (query !== null) {
            setSearchQuery(query);
            setShowGlobalSelect(true);
            setSelectedIndex(0);
        } else {
            setShowGlobalSelect(false);
            setSearchQuery('');
            setSelectedIndex(0);
        }
    };

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

                    const match = textBefore.match(/\{\{([a-zA-Z0-9_]*)$/);

                    if (match) {
                        const matchLength = match[0].length;
                        node.spliceText(offset - matchLength, matchLength, '');
                        const varNode = $createVariableNode(key);
                        selection.insertNodes([varNode]);
                    }
                }
            }
        });

        setShowGlobalSelect(false);
        setSearchQuery('');
        setSelectedIndex(0);
    };

    const handleKeyboardSelect = () => {
        if (filteredVariables.length > 0 && selectedIndex < filteredVariables.length) {
            handleVariableSelect(filteredVariables[selectedIndex]);
        }
    };

    return (
        <div className={cn("relative w-full", className)}>
            <GlobalVariableSelect
                open={showGlobalSelect}
                onOpenChange={setShowGlobalSelect}
                onSelect={handleVariableSelect}
                searchQuery={searchQuery}
                selectedIndex={selectedIndex}
                items={filteredVariables}
            >
                <div
                    className={cn(
                        "relative w-full rounded-md border border-input shadow-xs transition-[color,box-shadow] focus-within:ring-ring/50 focus-within:ring-[3px]",
                        !autoResize ? "min-h-0" : (multiline ? "min-h-[80px]" : "h-9 flex items-center"),
                        className
                    )}
                    style={contentStyle}
                >
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
                    {showGlobalSelect && (
                        <KeyboardNavigationPlugin
                            itemsCount={itemsCount}
                            selectedIndex={selectedIndex}
                            setSelectedIndex={setSelectedIndex}
                            onSelect={handleKeyboardSelect}
                        />
                    )}
                </div>
            </GlobalVariableSelect>
        </div>
    );
};

export const LexicalCMSField: React.FC<LexicalCMSFieldProps> = ({
    value,
    onChange,
    multiline = false,
    className,
    inputClassName,
    placeholder,
    id,
    autoResize = true,
    rows,
    minRows,
    maxRows
}) => {
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
                autoResize={autoResize}
                rows={rows}
                minRows={minRows}
                maxRows={maxRows}
            />
        </LexicalComposer>
    );
};
