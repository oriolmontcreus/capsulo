import {
    type InitialConfigType,
    LexicalComposer,
} from "@lexical/react/LexicalComposer"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { useEffect, useRef } from "react"
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
import type { EditorState, SerializedEditorState } from "lexical"

import { editorTheme } from "@/components/editor/themes/editor-theme"
import { TooltipProvider } from "@/components/ui/tooltip"

import { cn } from "@/lib/utils"
import { nodes } from "./nodes"
import { ConfigurablePlugins } from "./configurable-plugins"
import type { PluginFeature } from "@/lib/form-builder/fields/RichEditor/richeditor.plugins"

const editorConfig: InitialConfigType = {
    namespace: "Editor",
    theme: editorTheme,
    nodes,
    onError: (error: Error) => {
        console.error(error)
    },
}

// Helper to validate if a serialized state looks like valid Lexical state
function isValidLexicalState(state: unknown): boolean {
    if (!state || typeof state !== 'object') return false
    const s = state as Record<string, unknown>
    // A valid Lexical state must have a root property with type and children
    if (!s.root || typeof s.root !== 'object') return false
    const root = s.root as Record<string, unknown>
    return root.type === 'root' && Array.isArray(root.children)
}

// Helper to safely get valid editor state for initial config
function getValidInitialState(
    editorSerializedState?: SerializedEditorState,
    editorStateJson?: string
): string | undefined {
    if (editorStateJson) {
        try {
            const parsed = JSON.parse(editorStateJson)
            if (isValidLexicalState(parsed)) {
                return editorStateJson
            }
        } catch {
            // Invalid JSON, ignore
        }
        return undefined
    }

    if (editorSerializedState) {
        if (isValidLexicalState(editorSerializedState)) {
            return JSON.stringify(editorSerializedState)
        }
    }

    return undefined
}

export interface ConfigurableEditorProps {
    editorState?: EditorState
    editorSerializedState?: SerializedEditorState
    editorStateJson?: string
    onChange?: (editorState: EditorState) => void
    onSerializedChange?: (editorSerializedState: SerializedEditorState) => void
    enabledFeatures?: PluginFeature[]
    disabledFeatures?: PluginFeature[]
    disableAllFeatures?: boolean
    maxLength?: number
    /** When true, uses auto-height instead of full viewport height */
    compact?: boolean
    uploadComponentId?: string
    uploadFieldName?: string
    error?: string | boolean
}


function UpdateStatePlugin({
    editorSerializedState,
    editorStateJson,
    lastEmittedJsonRef,
    lastEmittedObjectRef
}: {
    editorSerializedState?: SerializedEditorState,
    editorStateJson?: string,
    lastEmittedJsonRef: React.MutableRefObject<string | null>,
    lastEmittedObjectRef: React.MutableRefObject<SerializedEditorState | null>
}) {
    const [editor] = useLexicalComposerContext()

    useEffect(() => {
        if (!editorSerializedState && !editorStateJson) return

        // Validate incoming state before processing
        let parsedState: unknown
        if (editorStateJson) {
            try {
                parsedState = JSON.parse(editorStateJson)
            } catch {
                console.warn("Invalid editorStateJson, skipping update")
                return
            }
        } else {
            parsedState = editorSerializedState
        }

        // Validate that it's a proper Lexical state
        if (!isValidLexicalState(parsedState)) {
            console.warn("Invalid Lexical state structure, skipping update")
            return
        }

        // Skip if same object reference (optimization)
        if (editorSerializedState && lastEmittedObjectRef.current === editorSerializedState) {
            return
        }

        // Resolve incoming state to string for comparison
        const incomingJsonString = editorStateJson !== undefined
            ? editorStateJson
            : JSON.stringify(editorSerializedState)

        // Check actual editor state
        const currentEditorState = editor.getEditorState()
        const currentJsonString = JSON.stringify(currentEditorState.toJSON())

        if (currentJsonString !== incomingJsonString) {
            try {
                const newState = editor.parseEditorState(
                    parsedState as SerializedEditorState
                )

                // Update refs BEFORE setting state to prevent race conditions
                const newJson = newState.toJSON()
                lastEmittedJsonRef.current = JSON.stringify(newJson)
                lastEmittedObjectRef.current = newJson

                queueMicrotask(() => {
                    editor.setEditorState(newState)
                })
            } catch (e) {
                console.error("Failed to parse editor state", e)
            }
        }
    }, [editor, editorSerializedState, editorStateJson, lastEmittedJsonRef, lastEmittedObjectRef])

    return null
}

export function ConfigurableEditor({
    editorState,
    editorSerializedState,
    editorStateJson,
    onChange,
    onSerializedChange,
    enabledFeatures,
    disabledFeatures,
    disableAllFeatures,
    maxLength,
    compact = false,
    uploadComponentId,
    uploadFieldName,
    error,
}: ConfigurableEditorProps) {
    // Ref to track the last JSON string we emitted via onChange
    const lastEmittedJsonRef = useRef<string | null>(null)
    const lastEmittedObjectRef = useRef<SerializedEditorState | null>(null)

    return (
        <div className={cn(
            "bg-background overflow-hidden rounded-lg border shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]",
            error
                ? "border-destructive focus-within:border-destructive focus-within:ring-destructive/20 dark:focus-within:ring-destructive/40"
                : "border-border/60 focus-within:border-ring focus-within:ring-ring/50"
        )}>
            <LexicalComposer
                initialConfig={{
                    ...editorConfig,
                    ...(editorState ? { editorState } : {}),
                    ...(() => {
                        const validState = getValidInitialState(editorSerializedState, editorStateJson)
                        return validState ? { editorState: validState } : {}
                    })(),
                }}
            >
                <TooltipProvider>
                    <ConfigurablePlugins
                        enabledFeatures={enabledFeatures}
                        disabledFeatures={disabledFeatures}
                        disableAllFeatures={disableAllFeatures}
                        maxLength={maxLength}
                        compact={compact}
                        uploadComponentId={uploadComponentId}
                        uploadFieldName={uploadFieldName}
                    />

                    <UpdateStatePlugin
                        editorSerializedState={editorSerializedState}
                        editorStateJson={editorStateJson}
                        lastEmittedJsonRef={lastEmittedJsonRef}
                        lastEmittedObjectRef={lastEmittedObjectRef}
                    />

                    <OnChangePlugin
                        ignoreSelectionChange={true}
                        onChange={(editorState) => {
                            // Update our ref immediately
                            const json = editorState.toJSON()
                            const jsonString = JSON.stringify(json)
                            lastEmittedJsonRef.current = jsonString
                            lastEmittedObjectRef.current = json

                            onChange?.(editorState)
                            onSerializedChange?.(json)
                        }}
                    />
                </TooltipProvider>
            </LexicalComposer>
        </div>
    )
}
