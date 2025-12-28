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

            // 1. Placeholder Management
            // Using a unique internal prefix to prevent collisions with valid user text
            const VAR_PREFIX = `__CPSL_VAR_`;
            const VAR_SUFFIX = `__`;
            const varToPlaceholder = new Map<string, string>();
            const placeholderToVar = new Map<string, string>();
            let varCounter = 0;

            const getPlaceholder = (match: string) => {
                if (varToPlaceholder.has(match)) return varToPlaceholder.get(match)!;
                const placeholder = `${VAR_PREFIX}${varCounter++}${VAR_SUFFIX}`;
                varToPlaceholder.set(match, placeholder);
                placeholderToVar.set(placeholder, match);
                return placeholder;
            };

            // 2. Prepare text for diffing
            const variableRegex = /\{\{[^}]+\}\}/g;
            const normalizedOld = oldValue ?? '';
            const normalizedNew = newValue ?? '';

            const oldProcessed = normalizedOld.replace(variableRegex, getPlaceholder);
            const newProcessed = normalizedNew.replace(variableRegex, getPlaceholder);

            // 3. Compute word-level diff
            const changes = Diff.diffWords(oldProcessed, newProcessed);

            // 4. Transform diff results into Lexical nodes
            // Pre-compile the placeholder matching regex for performance
            const placeholderMatcher = new RegExp(`(${VAR_PREFIX}\\d+${VAR_SUFFIX})`, 'g');

            changes.forEach((change) => {
                const diffType: DiffType = change.added ? 'added' : change.removed ? 'removed' : 'unchanged';

                // Split by placeholders while keeping the delimiters in the output array
                const segments = change.value.split(placeholderMatcher);

                segments.forEach(segment => {
                    if (!segment) return;

                    const originalVar = placeholderToVar.get(segment);
                    if (originalVar) {
                        // Segment is a protected variable - restore it as a VariableNode
                        const varName = originalVar.slice(2, -2); // Strip {{ and }}
                        paragraph.append($createVariableNode(varName, diffType));
                    } else {
                        // Segment is regular text - render with diff styling
                        paragraph.append($createDiffTextNode(segment, diffType));
                    }
                });
            });

            root.append(paragraph);
        });
    }, [editor, oldValue, newValue, enabled]);

    return null;
}
