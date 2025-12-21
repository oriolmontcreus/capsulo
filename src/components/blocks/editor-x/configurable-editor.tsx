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
        if (!editorSerializedState && !editorStateJson) {
            console.log('[UpdateStatePlugin DEBUG] No state provided, skipping');
            return
        }

        // 0. Optimization: Check object reference identity
        if (editorSerializedState && lastEmittedObjectRef.current === editorSerializedState) {
            console.log('[UpdateStatePlugin DEBUG] Same object reference, skipping');
            return
        }

        // 1. Resolve incoming state to string for comparison
        let incomingJsonString: string
        if (editorStateJson !== undefined) {
            incomingJsonString = editorStateJson
        } else {
            incomingJsonString = JSON.stringify(editorSerializedState)
        }

        // Debug: Check for image nodes in incoming state
        const hasImageInIncoming = incomingJsonString.includes('"type":"image"');
        if (hasImageInIncoming) {
            console.log('[UpdateStatePlugin DEBUG] Incoming state has image. First 1000 chars:',
                incomingJsonString.substring(0, 1000));
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

        // Debug: Check for image nodes in current state
        const hasImageInCurrent = currentJsonString.includes('"type":"image"');
        if (hasImageInCurrent || hasImageInIncoming) {
            console.log('[UpdateStatePlugin DEBUG] Current state has image:', hasImageInCurrent);
            console.log('[UpdateStatePlugin DEBUG] States are equal:', currentJsonString === incomingJsonString);
        }

        if (currentJsonString !== incomingJsonString) {
            console.log('[UpdateStatePlugin DEBUG] States differ, updating editor');
            try {
                // Parse and set
                const newState = editor.parseEditorState(
                    editorStateJson ? JSON.parse(editorStateJson) : editorSerializedState
                )

                // CRITICAL FIX: Update the refs BEFORE setting state to prevent 
                // OnChangePlugin from emitting the old state and creating a race condition.
                // When setEditorState is called, OnChangePlugin will fire - if our refs
                // still have old values, the stale data could be emitted.
                const newJson = newState.toJSON()
                const newJsonString = JSON.stringify(newJson)
                lastEmittedJsonRef.current = newJsonString
                lastEmittedObjectRef.current = newJson

                // Use queueMicrotask for more immediate execution than setTimeout
                // This reduces the window for race conditions
                queueMicrotask(() => {
                    console.log('[UpdateStatePlugin DEBUG] Calling setEditorState');
                    editor.setEditorState(newState)
                })
            } catch (e) {
                console.error("Failed to parse editor state", e)
            }
        } else {
            console.log('[UpdateStatePlugin DEBUG] States are equal, no update needed');
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
