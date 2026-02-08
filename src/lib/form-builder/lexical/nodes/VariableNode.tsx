import type { NodeKey, SerializedLexicalNode, Spread } from "lexical";
import { DecoratorNode } from "lexical";
import React from "react";
import capsuloConfig from "@/capsulo.config";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TranslationContext } from "../../context/TranslationContext";
import { useLexicalLocale } from "../LexicalContext";
import { loadGlobalVariables } from "../utils/global-variables";
import type { DiffType } from "./DiffTextNode";

export type SerializedVariableNode = Spread<
  {
    name: string;
    diffType?: DiffType;
  },
  SerializedLexicalNode
>;

export class VariableNode extends DecoratorNode<React.JSX.Element> {
  __name: string;
  __diffType: DiffType;

  static getType(): string {
    return "variable";
  }

  static clone(node: VariableNode): VariableNode {
    return new VariableNode(node.__name, node.__diffType, node.__key);
  }

  static importJSON(serializedNode: SerializedVariableNode): VariableNode {
    return $createVariableNode(serializedNode.name, serializedNode.diffType);
  }

  constructor(name: string, diffType: DiffType = "unchanged", key?: NodeKey) {
    super(key);
    this.__name = name;
    this.__diffType = diffType;
  }

  exportJSON(): SerializedVariableNode {
    return {
      name: this.__name,
      diffType: this.__diffType,
      type: "variable",
      version: 1,
    };
  }

  createDOM(): HTMLElement {
    return document.createElement("span");
  }

  updateDOM(): boolean {
    return false;
  }

  decorate(): React.JSX.Element {
    return <VariableComponent diffType={this.__diffType} name={this.__name} />;
  }

  getTextContent(): string {
    return `{{${this.__name}}}`;
  }

  isInline(): boolean {
    return true;
  }

  isKeyboardSelectable(): boolean {
    return true;
  }
}

const VariableComponent = ({
  name,
  diffType,
}: {
  name: string;
  diffType?: DiffType;
}) => {
  const [value, setValue] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const { locale } = useLexicalLocale();

  // Use context directly to avoid throwing when no TranslationProvider exists
  const translationContext = React.useContext(TranslationContext);
  const defaultLocale =
    translationContext?.defaultLocale ??
    capsuloConfig.i18n?.defaultLocale ??
    "en";

  const targetLocale = locale || defaultLocale;

  React.useEffect(() => {
    const fetchValue = async () => {
      try {
        setError(null); // Clear any previous errors
        const data = await loadGlobalVariables();
        const globalVar = data?.variables?.find((v: any) => v.id === "globals");
        if (globalVar?.data?.[name]) {
          const field = globalVar.data[name];
          const val = field.value;

          if (typeof val === "object" && val !== null) {
            // Handle localized values with graceful fallback
            // Ensure it looks like a localized map
            if (targetLocale in val || defaultLocale in val) {
              const localizedVal = val[targetLocale] || val[defaultLocale];
              setValue(
                typeof localizedVal === "string"
                  ? localizedVal
                  : JSON.stringify(localizedVal)
              );
            } else {
              setValue(JSON.stringify(val));
            }
          } else {
            setValue(String(val));
          }
        }
      } catch (e) {
        const errorMessage = `Failed to load global variable "${name}": ${e instanceof Error ? e.message : String(e)}`;
        console.error(errorMessage, e);
        setError(errorMessage);
        setValue(null);
      }
    };
    fetchValue();
  }, [name, targetLocale, defaultLocale]);

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`variable-node mx-0.5 inline cursor-help rounded px-0.5 font-medium transition-all duration-150 ease-in-out selection:bg-primary selection:text-primary-foreground ${
              diffType === "added"
                ? "bg-green-500/20 text-green-400 selection:bg-green-500 selection:text-green-950"
                : diffType === "removed"
                  ? "bg-red-500/20 text-red-400 line-through decoration-red-400 selection:bg-red-500 selection:text-red-950"
                  : "text-primary hover:bg-primary/10"
            }`}
            contentEditable={false}
            style={{
              userSelect: "text",
              WebkitUserSelect: "text",
            }}
          >
            {`{{${name}}}`}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {error ? (
            <span className="text-red-500">{error}</span>
          ) : (
            value || "Loading..."
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export function $createVariableNode(
  name: string,
  diffType: DiffType = "unchanged"
): VariableNode {
  return new VariableNode(name, diffType);
}

export function $isVariableNode(node: any): node is VariableNode {
  return node instanceof VariableNode;
}
