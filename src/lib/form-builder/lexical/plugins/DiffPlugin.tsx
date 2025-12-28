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

            // 1. Collect and replace variables with unique placeholders to prevent them from being split by the diff engine
            const varRegex = /\{\{[^}]+\}\}/g;
            const varToPlaceholder = new Map<string, string>();
            const placeholderToVar = new Map<string, string>();
            let varCounter = 0;

            const replacer = (match: string) => {
                if (varToPlaceholder.has(match)) return varToPlaceholder.get(match)!;
                const p = `CAPSULOVAR${varCounter++}PLH`;
                varToPlaceholder.set(match, p);
                placeholderToVar.set(p, match);
                return p;
            };

            const oldReplaced = normalizedOld.replace(varRegex, replacer);
            const newReplaced = normalizedNew.replace(varRegex, replacer);

            // 2. Compute word-level diff on replaced text
            const changes = Diff.diffWords(oldReplaced, newReplaced);

            // 3. Render changes, restoring variables from placeholders
            changes.forEach((change) => {
                const text = change.value;

                // Split text by placeholders to identify where variables should be restored
                const pRegex = /(CAPSULOVAR\d+PLH)/g;
                const parts = text.split(pRegex);

                parts.forEach(part => {
                    if (!part) return;

                    let diffType: DiffType = 'unchanged';
                    if (change.added) diffType = 'added';
                    else if (change.removed) diffType = 'removed';

                    if (placeholderToVar.has(part)) {
                        // This part is a variable placeholder - restore original variable and diff styling
                        const originalVar = placeholderToVar.get(part)!;
                        const varName = originalVar.slice(2, -2); // remove {{ and }}
                        const varNode = $createVariableNode(varName, diffType);
                        paragraph.append(varNode);
                    } else {
                        // Regular text - apply diff styling
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
