import { DecoratorNode } from 'lexical';
import type { NodeKey, Spread, SerializedLexicalNode } from 'lexical';
import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLexicalLocale } from '../LexicalContext';
import { useTranslation } from '../../context/TranslationContext';

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
    const { locale } = useLexicalLocale();
    const { defaultLocale } = useTranslation();

    const targetLocale = locale || defaultLocale;

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

                        if (typeof val === 'object' && val !== null) {
                            // Handle localized values with graceful fallback
                            const localizedVal =
                                val[targetLocale] ||
                                val[defaultLocale] ||
                                Object.values(val)[0];

                            setValue(typeof localizedVal === 'string' ? localizedVal : JSON.stringify(localizedVal));
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
    }, [name, targetLocale, defaultLocale]);

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span contentEditable={false} className="text-blue-500 font-medium cursor-help inline-block mx-0.5 selection:bg-primary selection:text-primary-foreground">
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
