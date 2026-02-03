import {
    TextNode,
    type NodeKey,
    type SerializedTextNode,
    type EditorConfig,
    $applyNodeReplacement,
    type LexicalNode,
    type Spread,
} from 'lexical';

export type DiffType = 'added' | 'removed' | 'unchanged';

export type SerializedDiffTextNode = Spread<
    {
        diffType: DiffType;
    },
    SerializedTextNode
>;

/**
 * A custom Lexical TextNode that represents diff text with visual styling.
 * - 'added': Green background for new text
 * - 'removed': Red background with strikethrough for deleted text
 * - 'unchanged': Normal text styling
 */
export class DiffTextNode extends TextNode {
    __diffType: DiffType;

    static getType(): string {
        return 'diff-text';
    }

    static clone(node: DiffTextNode): DiffTextNode {
        return new DiffTextNode(node.__text, node.__diffType, node.__key);
    }

    constructor(text: string, diffType: DiffType = 'unchanged', key?: NodeKey) {
        super(text, key);
        this.__diffType = diffType;
    }

    getDiffType(): DiffType {
        return this.__diffType;
    }

    createDOM(config: EditorConfig): HTMLElement {
        const dom = super.createDOM(config);

        // Apply diff-specific styling
        switch (this.__diffType) {
            case 'added':
                dom.style.backgroundColor = 'rgba(34, 197, 94, 0.2)'; // green-500/20
                dom.classList.add('text-green-700', 'dark:text-green-400');
                break;
            case 'removed':
                dom.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'; // red-500/20
                dom.style.color = 'rgb(248, 113, 113)'; // red-400
                dom.style.textDecoration = 'line-through';
                break;
            case 'unchanged':
            default:
                // Use inherit to respect theme colors (works in both light and dark mode)
                dom.style.color = 'inherit';
                dom.style.opacity = '1';
                break;
        }

        return dom;
    }

    updateDOM(prevNode: DiffTextNode, dom: HTMLElement, config: EditorConfig): boolean {
        // Use prototype call to bypass TypeScript's strict 'this' type constraint
        const isUpdated = TextNode.prototype.updateDOM.call(this, prevNode, dom, config);

        // If diffType changed, we need to update the DOM
        if (prevNode.__diffType !== this.__diffType) {
            return true;
        }

        return isUpdated;
    }

    static importJSON(serializedNode: SerializedDiffTextNode): DiffTextNode {
        const node = $createDiffTextNode(serializedNode.text, serializedNode.diffType);
        node.setFormat(serializedNode.format);
        node.setDetail(serializedNode.detail);
        node.setMode(serializedNode.mode);
        node.setStyle(serializedNode.style);
        return node;
    }

    exportJSON(): SerializedDiffTextNode {
        return {
            ...super.exportJSON(),
            diffType: this.__diffType,
            type: 'diff-text',
            version: 1,
        };
    }

    // Prevent editing in diff mode
    isEditable(): boolean {
        return false;
    }
}

export function $createDiffTextNode(text: string, diffType: DiffType = 'unchanged'): DiffTextNode {
    return $applyNodeReplacement(new DiffTextNode(text, diffType));
}

export function $isDiffTextNode(node: LexicalNode | null | undefined): node is DiffTextNode {
    return node instanceof DiffTextNode;
}
