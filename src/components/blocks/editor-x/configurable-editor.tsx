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
        // If neither is provided, nothing to sync
        if (!editorSerializedState && !editorStateJson) return

        // 0. Optimization: Check object reference identity
        if (editorSerializedState && lastEmittedObjectRef.current === editorSerializedState) {
            return
        }

        // 1. Resolve incoming state to string for comparison
        let incomingJsonString: string
        if (editorStateJson !== undefined) {
            incomingJsonString = editorStateJson
        } else {
            incomingJsonString = JSON.stringify(editorSerializedState)
        }

        // 2. Optimization: Check if this incoming state is exactly what we just emitted
        // If so, we can safely ignore it to prevent loops and unnecessary work.
        // BUT: If the incoming state has changed (e.g. image URLs resolved), we MUST process it.
        // The check against currentEditorState below will handle the "is it actually different" logic.
        // So we removed the early return here that was based solely on lastEmittedJsonRef.


        // 3. If we are here, it's an external update (or mismatch). Check actual editor state.
        const currentEditorState = editor.getEditorState()
        const currentSerialized = currentEditorState.toJSON()
        const currentJsonString = JSON.stringify(currentSerialized)

        if (currentJsonString !== incomingJsonString) {
            try {
                // Parse and set
                const newState = editor.parseEditorState(
                    editorStateJson ? JSON.parse(editorStateJson) : editorSerializedState
                )

                // Update the ref to prevent immediate loopback if the set triggers onChange
                // (though onChange usually triggers on user interaction or explicit dispatch, 
                // setting state programmatically might trigger it depending on listener config.
                // Lexical OnChangePlugin ignores selection changes but not content changes).
                // We set it here so when OnChangePlugin fires, we know it matches.
                // HOWEVER: setEditorState is async-ish.
                // Actually, let's keep it simple.
                // If we set state, we expect the editor to be that state.

                // Use setTimeout to avoid flushSync errors
                setTimeout(() => {
                    editor.setEditorState(newState)
                }, 0)
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
}: ConfigurableEditorProps) {
    // Ref to track the last JSON string we emitted via onChange
    const lastEmittedJsonRef = useRef<string | null>(null)
    const lastEmittedObjectRef = useRef<SerializedEditorState | null>(null)

    return (
        <div className="bg-background overflow-visible rounded-lg border shadow">
            <LexicalComposer
                initialConfig={{
                    ...editorConfig,
                    ...(editorState ? { editorState } : {}),
                    ...(editorSerializedState || editorStateJson
                        ? {
                            editorState: editorStateJson || JSON.stringify(editorSerializedState)
                        }
                        : {}),
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
