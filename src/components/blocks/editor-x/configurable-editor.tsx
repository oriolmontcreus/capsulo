import {
    type InitialConfigType,
    LexicalComposer,
} from "@lexical/react/LexicalComposer"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { useEffect, useRef, useMemo } from "react"
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import type { EditorState, SerializedEditorState } from "lexical"

import { editorTheme } from "@/components/editor/themes/editor-theme"
import { TooltipProvider } from "@/components/ui/tooltip"

import { cn } from "@/lib/utils"
import { nodes } from "./nodes"
import { ConfigurablePlugins } from "./configurable-plugins"
import { ContentEditable } from "@/components/editor/editor-ui/content-editable"
import { ContentEditable as LexicalContentEditable } from "@lexical/react/LexicalContentEditable"
import { DiffPlugin } from "@/lib/form-builder/lexical/plugins/DiffPlugin"
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

// Helper to extract text content from serialized state for diffing
function extractTextFromSerializedState(state: any): string {
    if (!state) return '';

    // Handle JSON string
    if (typeof state === 'string') {
        // If it looks like JSON, try to parse it
        if (state.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(state);
                return extractTextFromSerializedState(parsed);
            } catch {
                return state;
            }
        }
        // Plain string
        return state;
    }

    // Handle SerializedEditorState
    if (state.root && Array.isArray(state.root.children)) {
        return state.root.children.map((child: any) => getTextFromNode(child)).join('\n');
    }

    return String(state);
}

function getTextFromNode(node: any): string {
    if (node.text) return node.text;
    if (Array.isArray(node.children)) {
        return node.children.map((n: any) => getTextFromNode(n)).join('');
    }
    return '';
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
    /** Enable diff mode */
    diffMode?: boolean
    /** Old value for diff comparison */
    diffOldValue?: any
    /** Read only mode */
    readOnly?: boolean
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
    diffMode = false,
    diffOldValue,
    readOnly = false,
}: ConfigurableEditorProps) {
    // Ref to track the last JSON string we emitted via onChange
    const lastEmittedJsonRef = useRef<string | null>(null)
    const lastEmittedObjectRef = useRef<SerializedEditorState | null>(null)

    // Prepare diff capability
    const diffOldText = useMemo(() => diffMode ? extractTextFromSerializedState(diffOldValue) : '', [diffMode, diffOldValue])
    const diffNewText = useMemo(() => {
        if (!diffMode) return ''
        if (editorStateJson) return extractTextFromSerializedState(editorStateJson)
        if (editorSerializedState) return extractTextFromSerializedState(editorSerializedState)
        return ''
    }, [diffMode, editorStateJson, editorSerializedState])

    return (
        <div className={cn(
            "bg-background overflow-hidden rounded-lg border shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]",
            error
                ? "border-destructive focus-within:border-destructive focus-within:ring-destructive/20 dark:focus-within:ring-destructive/40"
                : "border-border/60 focus-within:border-ring focus-within:ring-ring/50",
            diffMode && "pointer-events-none opacity-90" // Visual cue for read-only diff
        )}>
            <LexicalComposer
                initialConfig={{
                    ...editorConfig,
                    editable: !diffMode && !readOnly, // Make read-only in diff mode or if specifically requested
                    ...(editorState ? { editorState } : {}),
                    ...(() => {
                        const validState = getValidInitialState(editorSerializedState, editorStateJson)
                        return validState ? { editorState: validState } : {}
                    })(),
                }}
            >
                <TooltipProvider>
                    {(!diffMode && !readOnly) && (
                        <ConfigurablePlugins
                            enabledFeatures={enabledFeatures}
                            disabledFeatures={disabledFeatures}
                            disableAllFeatures={disableAllFeatures}
                            maxLength={maxLength}
                            compact={compact}
                            uploadComponentId={uploadComponentId}
                            uploadFieldName={uploadFieldName}
                        />
                    )}

                    {!diffMode && (
                        <UpdateStatePlugin
                            editorSerializedState={editorSerializedState}
                            editorStateJson={editorStateJson}
                            lastEmittedJsonRef={lastEmittedJsonRef}
                            lastEmittedObjectRef={lastEmittedObjectRef}
                        />
                    )}

                    {!diffMode && (
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
                    )}

                    {diffMode && (
                        <>
                            <RichTextPlugin
                                contentEditable={
                                    <div className="relative">
                                        <LexicalContentEditable
                                            className="ContentEditable__root relative block overflow-visible px-8 py-4 focus:outline-none bg-input min-h-[100px]"
                                        />
                                    </div>
                                }
                                ErrorBoundary={LexicalErrorBoundary}
                            />
                            <DiffPlugin
                                enabled={true}
                                oldValue={diffOldText}
                                newValue={diffNewText}
                            />
                        </>
                    )}

                    {readOnly && !diffMode && (
                        <RichTextPlugin
                            contentEditable={
                                <div className="relative">
                                    <LexicalContentEditable
                                        className="ContentEditable__root relative block overflow-visible px-8 py-4 focus:outline-none bg-input min-h-[100px]"
                                    />
                                </div>
                            }
                            ErrorBoundary={LexicalErrorBoundary}
                        />
                    )}

                </TooltipProvider>
            </LexicalComposer>
        </div>
    )
}
