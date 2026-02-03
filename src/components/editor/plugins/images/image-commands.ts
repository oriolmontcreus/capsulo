import { createCommand, type LexicalCommand } from "lexical"
import type { ImagePayload } from "@/components/editor/nodes/image-node"

export type InsertImagePayload = Readonly<ImagePayload>

export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> =
    createCommand("INSERT_IMAGE_COMMAND")
