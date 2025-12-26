import React, { useEffect, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
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
    COMMAND_PRIORITY_HIGH,
    type EditorState
} from 'lexical';
import { VariableNode, $createVariableNode } from './nodes/VariableNode';
import { cn } from '@/lib/utils';
import { GlobalVariableSelect } from '../components/GlobalVariableSelect';
import type { VariableItem } from '../types';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { LexicalLocaleContext } from './LexicalContext';
import { loadGlobalVariables } from './utils/global-variables';

// Helper to initialize state from string
function $initialEditorState(value: unknown) {
    const root = $getRoot();
    if (root.getFirstChild()) return;

    const p = $createParagraphNode();

    // Ensure value is a string before processing
    let stringValue: string;
    if (typeof value === 'string') {
        stringValue = value;
    } else if (value == null) {
        stringValue = '';
    } else if (typeof value === 'object') {
        // Handle objects (like serialized editor state) - convert to empty string
        // The caller should handle conversion before passing to this function
        stringValue = '';
    } else {
        stringValue = String(value);
    }

    // Parse value for {{variables}}
    const parts = stringValue.split(/(\{\{[^}]+\}\})/g);

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

import { useTranslation } from '@/lib/form-builder/context/TranslationContext';

// Helper to fetch variables


// Module-level cache removed in favor of shared utility

const useGlobalVariables = (contextLocale?: string) => {
    const [variables, setVariables] = useState<VariableItem[]>([]);
    const { defaultLocale } = useTranslation();

    // Use passed locale or fallback to default
    const targetLocale = contextLocale || defaultLocale;

    useEffect(() => {
        let isMounted = true;

        const fetchVariables = async () => {
            try {
                const data = await loadGlobalVariables();
                const globals = data.variables?.find((v: any) => v.id === 'globals');

                if (globals && globals.data) {
                    const items = Object.entries(globals.data).map(([key, item]: [string, any]) => {
                        let displayValue = '';
                        const val = item.value;

                        if (typeof val === 'string') {
                            displayValue = val;
                        } else if (typeof val === 'object' && val !== null) {
                            // Handle localized values securely:
                            // Check if the object looks like a translation map (has target or default locale keys)
                            // This prevents treating arbitrary objects (like arrays or complex non-localized data) as maps.
                            if (targetLocale in val || defaultLocale in val) {
                                const localizedVal = val[targetLocale] || val[defaultLocale];
                                displayValue = typeof localizedVal === 'string' ? localizedVal : JSON.stringify(localizedVal);
                            } else {
                                // Fallback for complex objects that aren't localized maps
                                displayValue = JSON.stringify(val);
                            }
                        } else {
                            // Fallback for numbers, booleans, etc.
                            displayValue = String(val);
                        }

                        return {
                            key,
                            value: displayValue,
                            scope: 'Global' as const
                        };
                    });
                    if (isMounted) {
                        setVariables(items);
                    }
                } else {
                    // Explicitly set empty array when no globals are found
                    if (isMounted) {
                        setVariables([]);
                    }
                }
            } catch (error) {
                console.error('Failed to load global variables', error);
                // Set empty array on error to keep state in sync
                if (isMounted) {
                    setVariables([]);
                }
            }
        };
        fetchVariables();

        return () => {
            isMounted = false;
        };
    }, [targetLocale, defaultLocale]);

    return variables;
};

// Plugin to detect "{{query"
function AutocompletePlugin({ onTrigger }: { onTrigger: (query: string | null, rect: DOMRect | null) => void }) {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                const selection = $getSelection();

                if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
                    onTrigger(null, null);
                    return;
                }

                const node = selection.anchor.getNode();
                if (!(node instanceof TextNode)) {
                    onTrigger(null, null);
                    return;
                }

                const offset = selection.anchor.offset;
                const textOriginal = node.getTextContent();
                const textBefore = textOriginal.slice(0, offset);

                const match = textBefore.match(/\{\{([a-zA-Z0-9_]*)$/);

                if (match) {
                    let rect: DOMRect | null = null;
                    try {
                        const domSelection = window.getSelection();
                        if (domSelection && domSelection.rangeCount > 0) {
                            const domRange = domSelection.getRangeAt(0);
                            rect = domRange.getBoundingClientRect();
                        }
                    } catch (error) {
                        // Silently handle any selection-related errors
                        console.warn('Error getting selection range:', error);
                    }
                    onTrigger(match[1], rect);
                } else {
                    onTrigger(null, null);
                }
            });
        });
    }, [editor, onTrigger]);

    return null;
}

// Plugin to prevent Enter key in single-line mode
function SingleLinePlugin({ multiline, menuOpen }: { multiline: boolean, menuOpen: boolean }) {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (multiline) return; // Only active in single-line mode

        return editor.registerCommand(
            KEY_ENTER_COMMAND,
            (event) => {
                // If menu is open, let KeyboardNavigationPlugin handle it
                if (menuOpen) return false;

                // Prevent Enter from creating new lines in single-line inputs
                if (event) event.preventDefault();
                return true; // Command handled
            },
            COMMAND_PRIORITY_HIGH // Higher priority than KeyboardNavigationPlugin
        );
    }, [editor, multiline, menuOpen]);

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

// Lexical editor configuration (module-scoped to avoid recreation on every render)
const LEXICAL_INITIAL_CONFIG = {
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
    locale?: string;
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
    maxRows,
    locale
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
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

    // Fetch variables
    const variables = useGlobalVariables(locale);

    // Compute filtered variables
    const filteredVariables = React.useMemo(() => {
        if (!searchQuery) return variables;
        const lowerQuery = searchQuery.toLowerCase();
        return variables.filter(v => v.key.toLowerCase().includes(lowerQuery));
    }, [variables, searchQuery]);

    const itemsCount = filteredVariables.length;

    // Sync value from props to editor
    useEffect(() => {
        editor.update(() => {
            const root = $getRoot();
            const currentText = root.getTextContent();

            // If editor is empty but we have a value, initialize it (Data Loaded case)
            // Handle both empty string and single newline (common in some editor states)
            if ((currentText === '' || currentText === '\n') && value && value !== '\n') {
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

    const handleAutocomplete = (query: string | null, rect: DOMRect | null = null) => {
        if (query !== null) {
            setSearchQuery(query);
            setAnchorRect(rect);
            setShowGlobalSelect(true);
            setSelectedIndex(0);
        } else {
            setShowGlobalSelect(false);
            setSearchQuery('');
            setSelectedIndex(0);
            setAnchorRect(null);
        }
    };

    const handleVariableSelect = (item: VariableItem) => {
        const key = item.key;
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
        setAnchorRect(null);
    };

    const handleKeyboardSelect = () => {
        if (filteredVariables.length > 0 && selectedIndex < filteredVariables.length) {
            handleVariableSelect(filteredVariables[selectedIndex]);
        }
    };

    return (
        <LexicalLocaleContext.Provider value={{ locale }}>
            <div className={cn("relative w-full", className)}>
                <GlobalVariableSelect
                    open={showGlobalSelect}
                    onOpenChange={setShowGlobalSelect}
                    onSelect={handleVariableSelect}
                    searchQuery={searchQuery}
                    selectedIndex={selectedIndex}
                    items={filteredVariables}
                    anchorRect={anchorRect}
                >
                    <div
                        className={cn(
                            "relative w-full rounded-md border border-border/60 shadow-xs bg-input transition-[color,box-shadow] focus-within:ring-ring/50 focus-within:ring-[3px]",
                            !autoResize ? "min-h-0" : (multiline ? "min-h-[80px]" : "h-9 flex items-center")
                        )}
                        style={contentStyle}
                    >
                        <PlainTextPlugin
                            contentEditable={
                                <div className="w-full h-full text-left">
                                    <ContentEditable
                                        className={cn(
                                            "w-full h-full px-3 py-1 text-sm outline-none selection:bg-primary selection:text-primary-foreground",
                                            multiline ? "align-top" : "overflow-hidden whitespace-nowrap",
                                            inputClassName
                                        )}
                                        id={id}
                                    />
                                </div>
                            }
                            placeholder={
                                placeholder ? <div className="absolute top-2 left-3 text-sm text-muted-foreground pointer-events-none select-none">{placeholder}</div> : null
                            }
                            ErrorBoundary={LexicalErrorBoundary}
                        />
                        <HistoryPlugin />
                        <OnChangePlugin onChange={handleOnChange} />
                        <AutocompletePlugin onTrigger={handleAutocomplete} />
                        <SingleLinePlugin multiline={multiline ?? false} menuOpen={showGlobalSelect} />
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
        </LexicalLocaleContext.Provider>
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
    maxRows,
    locale
}) => {
    return (
        <LexicalComposer initialConfig={LEXICAL_INITIAL_CONFIG}>
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
                locale={locale}
            />
        </LexicalComposer>
    );
};
