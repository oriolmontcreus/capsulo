import { DecoratorNode } from 'lexical';
import type { NodeKey, Spread, SerializedLexicalNode } from 'lexical';
import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLexicalLocale } from '../LexicalContext';
import { TranslationContext } from '../../context/TranslationContext';
import { loadGlobalVariables } from '../utils/global-variables';
import { capsuloConfig } from '@/lib/config';

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

    // Use context directly to avoid throwing when no TranslationProvider exists
    const translationContext = React.useContext(TranslationContext);
    const defaultLocale = translationContext?.defaultLocale
        ?? capsuloConfig.i18n?.defaultLocale
        ?? 'en';

    const targetLocale = locale || defaultLocale;

    React.useEffect(() => {
        const fetchValue = async () => {
            try {
                const data = await loadGlobalVariables();
                const globalVar = data.variables?.find((v: any) => v.id === 'globals');
                if (globalVar?.data?.[name]) {
                    const field = globalVar.data[name];
                    const val = field.value;

                    if (typeof val === 'object' && val !== null) {
                        // Handle localized values with graceful fallback
                        // Ensure it looks like a localized map
                        if (targetLocale in val || defaultLocale in val) {
                            const localizedVal = val[targetLocale] || val[defaultLocale];
                            setValue(typeof localizedVal === 'string' ? localizedVal : JSON.stringify(localizedVal));
                        } else {
                            setValue(JSON.stringify(val));
                        }
                    } else {
                        setValue(String(val));
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
                    <span contentEditable={false} className="text-blue-500 dark:text-blue-400 font-medium cursor-help inline-block mx-0.5 selection:bg-primary selection:text-primary-foreground hover:bg-blue-500/10 ease-in-out duration-150 transition-all rounded">
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
