import React, { useEffect, useState, useMemo } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    $getSelection,
    $isRangeSelection,
    TextNode,
    KEY_ARROW_DOWN_COMMAND,
    KEY_ARROW_UP_COMMAND,
    KEY_ENTER_COMMAND,
    COMMAND_PRIORITY_NORMAL,
} from 'lexical';
import { $createVariableNode } from '@/lib/form-builder/lexical/nodes/VariableNode';
import { GlobalVariableSelect } from '@/lib/form-builder/components/GlobalVariableSelect';
import { useGlobalVariables } from '@/lib/form-builder/lexical/hooks/useGlobalVariables';
import type { VariableItem } from '@/lib/form-builder/types';

// Plugin to detect "{{query"
function TriggerPlugin({ onTrigger }: { onTrigger: (query: string | null, rect: DOMRect | null) => void }) {
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

export function VariablesPlugin() {
    const [editor] = useLexicalComposerContext();
    const [showGlobalSelect, setShowGlobalSelect] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

    // Fetch variables - omitting locale for now as it's not passed to ConfigurableEditor
    const variables = useGlobalVariables();

    // Compute filtered variables
    const filteredVariables = useMemo(() => {
        if (!searchQuery) return variables;
        const lowerQuery = searchQuery.toLowerCase();
        return variables.filter(v => v.key.toLowerCase().includes(lowerQuery));
    }, [variables, searchQuery]);

    const itemsCount = filteredVariables.length;

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
        <>
            <TriggerPlugin onTrigger={handleAutocomplete} />
            {showGlobalSelect && (
                <>
                    <KeyboardNavigationPlugin
                        itemsCount={itemsCount}
                        selectedIndex={selectedIndex}
                        setSelectedIndex={setSelectedIndex}
                        onSelect={handleKeyboardSelect}
                    />
                    <GlobalVariableSelect
                        open={showGlobalSelect}
                        onOpenChange={setShowGlobalSelect}
                        onSelect={handleVariableSelect}
                        searchQuery={searchQuery}
                        selectedIndex={selectedIndex}
                        items={filteredVariables}
                        anchorRect={anchorRect}
                    >
                        {/* Empty children as we are positioning via anchorRect */}
                        <></>
                    </GlobalVariableSelect>
                </>
            )}
        </>
    );
}
