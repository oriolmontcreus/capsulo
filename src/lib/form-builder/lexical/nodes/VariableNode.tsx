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

const VariableComponent = ({ name }: { name: string }) => {
    const [value, setValue] = React.useState<string | null>(null);

    React.useEffect(() => {
        const fetchValue = async () => {
            try {
                const res = await fetch('/api/cms/globals/load');
                if (res.ok) {
                    const data = await res.json();
                    const globalVar = data.variables?.find((v: any) => v.id === 'globals');
                    if (globalVar?.data?.[name]) {
                        const field = globalVar.data[name];
                        const val = field.value;
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
