import { createCommand, type LexicalCommand, type NodeKey } from "lexical"

export const INSERT_LAYOUT_COMMAND: LexicalCommand<string> =
    createCommand<string>("INSERT_LAYOUT_COMMAND")

export const UPDATE_LAYOUT_COMMAND: LexicalCommand<{
    template: string
    nodeKey: NodeKey
}> = createCommand<{ template: string; nodeKey: NodeKey }>("UPDATE_LAYOUT_COMMAND")
