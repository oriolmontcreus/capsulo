import {
    type InitialConfigType,
    LexicalComposer,
} from "@lexical/react/LexicalComposer"
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
    onChange?: (editorState: EditorState) => void
    onSerializedChange?: (editorSerializedState: SerializedEditorState) => void
    enabledFeatures?: PluginFeature[]
    disabledFeatures?: PluginFeature[]
    disableAllFeatures?: boolean
    maxLength?: number
}

export function ConfigurableEditor({
    editorState,
    editorSerializedState,
    onChange,
    onSerializedChange,
    enabledFeatures,
    disabledFeatures,
    disableAllFeatures,
    maxLength,
}: ConfigurableEditorProps) {
    return (
        <div className="bg-background overflow-visible rounded-lg border shadow">
            <LexicalComposer
                initialConfig={{
                    ...editorConfig,
                    ...(editorState ? { editorState } : {}),
                    ...(editorSerializedState
                        ? { editorState: JSON.stringify(editorSerializedState) }
                        : {}),
                }}
            >
                <TooltipProvider>
                    <ConfigurablePlugins
                        enabledFeatures={enabledFeatures}
                        disabledFeatures={disabledFeatures}
                        disableAllFeatures={disableAllFeatures}
                        maxLength={maxLength}
                    />

                    <OnChangePlugin
                        ignoreSelectionChange={true}
                        onChange={(editorState) => {
                            onChange?.(editorState)
                            onSerializedChange?.(editorState.toJSON())
                        }}
                    />
                </TooltipProvider>
            </LexicalComposer>
        </div>
    )
}
