import { DecoratorNode } from 'lexical';
import type { NodeKey, Spread, SerializedLexicalNode } from 'lexical';
import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type SerializedVariableNode = Spread<
    {
        name: string;
    },
    SerializedLexicalNode
>;

export class VariableNode extends DecoratorNode<React.JSX.Element> {
    __name: string;

    static getType(): string {
        return 'variable';
    }

    static clone(node: VariableNode): VariableNode {
        return new VariableNode(node.__name, node.__key);
    }

    static importJSON(serializedNode: SerializedVariableNode): VariableNode {
        return $createVariableNode(serializedNode.name);
    }

    constructor(name: string, key?: NodeKey) {
        super(key);
        this.__name = name;
    }

    exportJSON(): SerializedVariableNode {
        return {
            name: this.__name,
            type: 'variable',
            version: 1,
        };
    }

    createDOM(): HTMLElement {
        return document.createElement('span');
    }

    updateDOM(): boolean {
        return false;
    }

    decorate(): React.JSX.Element {
        return <VariableComponent name={this.__name} />;
    }

    getTextContent(): string {
        return `{{${this.__name}}}`;
    }
}

// Component to render inside the editor
const VariableComponent = ({ name }: { name: string }) => {
    // We need to fetch the value for the tooltip. 
    // Since this component is rendered by Lexical, it can use hooks but might be disconnected from main app context?
    // Lexical Decorators are rendered via React portals usually, so context *should* work if Editor is inside Provider.
    // We'll use a simple internal fetch/state here or rely on a cached store.

    // For simplicity/performance, let's duplicate the logic from VariableOverlay or use a shared store.
    // Or just fetch on hover? Fetching on mount is fine.

    const [value, setValue] = React.useState<string | null>(null);

    React.useEffect(() => {
        const fetchValue = async () => {
            // Quick fetch - in prod use react-query or similar
            try {
                const res = await fetch('/api/cms/globals/load');
                if (res.ok) {
                    const data = await res.json();
                    const globalVar = data.variables?.find((v: any) => v.id === 'globals');
                    if (globalVar?.data?.[name]) {
                        const field = globalVar.data[name];
                        const val = field.value;
                        // Resolve simple value
                        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                            setValue(val['en'] || Object.values(val)[0] as string);
                        } else {
                            setValue(String(val));
                        }
                    }
                }
            } catch (e) {
                // ignore
            }
        };
        fetchValue();
    }, [name]);

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="text-blue-500 font-medium cursor-help inline-block mx-0.5 select-none">
                        {`{{${name}}}`}
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    {value || "Loading..."}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

export function $createVariableNode(name: string): VariableNode {
    return new VariableNode(name);
}

export function $isVariableNode(node: any): node is VariableNode {
    return node instanceof VariableNode;
}
