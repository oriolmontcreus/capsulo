import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $createParagraphNode } from 'lexical';
import * as Diff from 'diff';
import { $createDiffTextNode, type DiffType } from '../nodes/DiffTextNode';
import { $createVariableNode } from '../nodes/VariableNode';

interface DiffPluginProps {
    /** The old value to compare against */
    oldValue: string;
    /** The new/current value */
    newValue: string;
    /** Whether diff mode is enabled */
    enabled: boolean;
}

/**
 * A Lexical plugin that computes a word-level diff between oldValue and newValue,
 * and renders the content with styled DiffTextNode elements.
 */
export function DiffPlugin({ oldValue, newValue, enabled }: DiffPluginProps) {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (!enabled) return;

        editor.update(() => {
            const root = $getRoot();
            root.clear();

            const paragraph = $createParagraphNode();

            // Compute word-level diff
            const normalizedOld = oldValue ?? '';
            const normalizedNew = newValue ?? '';
            const changes = Diff.diffWords(normalizedOld, normalizedNew);

            changes.forEach((change) => {
                const text = change.value;

                // Check if text contains variables and split accordingly
                const parts = text.split(/(\{\{[^}]+\}\})/g);

                parts.forEach(part => {
                    if (!part) return;

                    const variableMatch = part.match(/^\{\{([^}]+)\}\}$/);
                    if (variableMatch) {
                        // This is a variable - render as VariableNode
                        // For now, just render it as text with the variable key
                        const varNode = $createVariableNode(variableMatch[1]);
                        paragraph.append(varNode);
                    } else {
                        // Regular text - apply diff styling
                        let diffType: DiffType = 'unchanged';
                        if (change.added) {
                            diffType = 'added';
                        } else if (change.removed) {
                            diffType = 'removed';
                        }

                        const diffNode = $createDiffTextNode(part, diffType);
                        paragraph.append(diffNode);
                    }
                });
            });

            root.append(paragraph);
        });
    }, [editor, oldValue, newValue, enabled]);

    return null;
}
