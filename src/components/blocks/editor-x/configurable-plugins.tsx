import React, { useState, useMemo, Suspense } from "react"
import {
    CHECK_LIST,
    ELEMENT_TRANSFORMERS,
    MULTILINE_ELEMENT_TRANSFORMERS,
    TEXT_FORMAT_TRANSFORMERS,
    TEXT_MATCH_TRANSFORMERS,
} from "@lexical/markdown"
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin"
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin"
import { ClickableLinkPlugin } from "@lexical/react/LexicalClickableLinkPlugin"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { HashtagPlugin } from "@lexical/react/LexicalHashtagPlugin"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin"
// TablePlugin is lazy-loaded via plugin-loader for performance

import { ContentEditable } from "@/components/editor/editor-ui/content-editable"
import { ActionsPlugin } from "@/components/editor/plugins/actions/actions-plugin"
import { CharacterLimitPlugin } from "@/components/editor/plugins/actions/character-limit-plugin"
import { ClearEditorActionPlugin } from "@/components/editor/plugins/actions/clear-editor-plugin"
import { CounterCharacterPlugin } from "@/components/editor/plugins/actions/counter-character-plugin"
// ImportExportPlugin is lazy-loaded via plugin-loader for performance
import { MarkdownTogglePlugin } from "@/components/editor/plugins/actions/markdown-toggle-plugin"
import { MaxLengthPlugin } from "@/components/editor/plugins/actions/max-length-plugin"
// SpeechToTextPlugin is lazy-loaded via plugin-loader for performance
import { AutoLinkPlugin } from "@/components/editor/plugins/auto-link-plugin"

// CodeActionMenuPlugin and CodeHighlightPlugin are lazy-loaded via plugin-loader for performance
import { ComponentPickerMenuPlugin } from "@/components/editor/plugins/component-picker-menu-plugin"
import { ContextMenuPlugin } from "@/components/editor/plugins/context-menu-plugin"
import { DragDropPastePlugin } from "@/components/editor/plugins/drag-drop-paste-plugin"
// DraggableBlockPlugin is lazy-loaded via plugin-loader for performance
// AutoEmbedPlugin, TwitterPlugin, YouTubePlugin are lazy-loaded via plugin-loader for performance
import { FloatingLinkEditorPlugin } from "@/components/editor/plugins/floating-link-editor-plugin"
import { FloatingTextFormatToolbarPlugin } from "@/components/editor/plugins/floating-text-format-plugin"
// ImagesPlugin is lazy-loaded via plugin-loader for performance
import { KeywordsPlugin } from "@/components/editor/plugins/keywords-plugin"
// LayoutPlugin is lazy-loaded via plugin-loader for performance
import { LinkPlugin } from "@/components/editor/plugins/link-plugin"
import { ListMaxIndentLevelPlugin } from "@/components/editor/plugins/list-max-indent-level-plugin"
// MentionsPlugin is lazy-loaded via plugin-loader for performance
import { AlignmentPickerPlugin } from "@/components/editor/plugins/picker/alignment-picker-plugin"
import { BulletedListPickerPlugin } from "@/components/editor/plugins/picker/bulleted-list-picker-plugin"
import { CheckListPickerPlugin } from "@/components/editor/plugins/picker/check-list-picker-plugin"
import { CodePickerPlugin } from "@/components/editor/plugins/picker/code-picker-plugin"
import { ColumnsLayoutPickerPlugin } from "@/components/editor/plugins/picker/columns-layout-picker-plugin"
import { DividerPickerPlugin } from "@/components/editor/plugins/picker/divider-picker-plugin"
import { EmbedsPickerPlugin } from "@/components/editor/plugins/picker/embeds-picker-plugin"
import { HeadingPickerPlugin } from "@/components/editor/plugins/picker/heading-picker-plugin"
import { ImagePickerPlugin } from "@/components/editor/plugins/picker/image-picker-plugin"
import { NumberedListPickerPlugin } from "@/components/editor/plugins/picker/numbered-list-picker-plugin"
import { ParagraphPickerPlugin } from "@/components/editor/plugins/picker/paragraph-picker-plugin"
import { QuotePickerPlugin } from "@/components/editor/plugins/picker/quote-picker-plugin"
import {
    DynamicTablePickerPlugin,
    TablePickerPlugin,
} from "@/components/editor/plugins/picker/table-picker-plugin"
import { TabFocusPlugin } from "@/components/editor/plugins/tab-focus-plugin"
import { BlockFormatDropDown } from "@/components/editor/plugins/toolbar/block-format-toolbar-plugin"
import { FormatBulletedList } from "@/components/editor/plugins/toolbar/block-format/format-bulleted-list"
import { FormatCheckList } from "@/components/editor/plugins/toolbar/block-format/format-check-list"
import { FormatCodeBlock } from "@/components/editor/plugins/toolbar/block-format/format-code-block"
import { FormatHeading } from "@/components/editor/plugins/toolbar/block-format/format-heading"
import { FormatNumberedList } from "@/components/editor/plugins/toolbar/block-format/format-numbered-list"
import { FormatParagraph } from "@/components/editor/plugins/toolbar/block-format/format-paragraph"
import { FormatQuote } from "@/components/editor/plugins/toolbar/block-format/format-quote"
import { BlockInsertPlugin } from "@/components/editor/plugins/toolbar/block-insert-plugin"
import { InsertColumnsLayout } from "@/components/editor/plugins/toolbar/block-insert/insert-columns-layout"
import { InsertEmbeds } from "@/components/editor/plugins/toolbar/block-insert/insert-embeds"
import { InsertHorizontalRule } from "@/components/editor/plugins/toolbar/block-insert/insert-horizontal-rule"
import { InsertImage } from "@/components/editor/plugins/toolbar/block-insert/insert-image"
import { InsertTable } from "@/components/editor/plugins/toolbar/block-insert/insert-table"
import { ClearFormattingToolbarPlugin } from "@/components/editor/plugins/toolbar/clear-formatting-toolbar-plugin"
import { CodeLanguageToolbarPlugin } from "@/components/editor/plugins/toolbar/code-language-toolbar-plugin"
import { ElementFormatToolbarPlugin } from "@/components/editor/plugins/toolbar/element-format-toolbar-plugin"
import { FontBackgroundToolbarPlugin } from "@/components/editor/plugins/toolbar/font-background-toolbar-plugin"
import { FontColorToolbarPlugin } from "@/components/editor/plugins/toolbar/font-color-toolbar-plugin"
import { FontFamilyToolbarPlugin } from "@/components/editor/plugins/toolbar/font-family-toolbar-plugin"
import { FontFormatToolbarPlugin } from "@/components/editor/plugins/toolbar/font-format-toolbar-plugin"
import { FontSizeToolbarPlugin } from "@/components/editor/plugins/toolbar/font-size-toolbar-plugin"
import { HistoryToolbarPlugin } from "@/components/editor/plugins/toolbar/history-toolbar-plugin"
import { LinkToolbarPlugin } from "@/components/editor/plugins/toolbar/link-toolbar-plugin"
import { SubSuperToolbarPlugin } from "@/components/editor/plugins/toolbar/subsuper-toolbar-plugin"
import { ToolbarPlugin } from "@/components/editor/plugins/toolbar/toolbar-plugin"
import { HR } from "@/components/editor/transformers/markdown-hr-transformer"
import { IMAGE } from "@/components/editor/transformers/markdown-image-transformer"
import { TABLE } from "@/components/editor/transformers/markdown-table-transformer"
import { TWEET } from "@/components/editor/transformers/markdown-tweet-transformer"
import { Separator } from "@/components/ui/separator"
import { VariablesPlugin } from "@/components/editor/plugins/variables-plugin"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

import type { PluginFeature } from "@/lib/form-builder/fields/RichEditor/richeditor.plugins"
import { DEFAULT_FEATURES } from "@/lib/form-builder/fields/RichEditor/richeditor.plugins"

// Import lazy-loaded plugins for heavy features
import {
    LazyTablePlugin,
    LazyImagesPlugin,
    LazyCodeHighlightPlugin,
    LazyCodeActionMenuPlugin,
    LazyTwitterPlugin,
    LazyYouTubePlugin,
    LazyAutoEmbedPlugin,
    LazyLayoutPlugin,
    LazyDraggableBlockPlugin,
    LazyMentionsPlugin,
    LazySpeechToTextPlugin,
    LazyImportExportPlugin,
} from "./plugin-loader"

const placeholder = "Press / for commands..."

// Minimal fallback component for lazy-loaded plugins
const PluginFallback = () => null

interface ConfigurablePluginsProps {
    enabledFeatures?: PluginFeature[]
    disabledFeatures?: PluginFeature[]
    disableAllFeatures?: boolean
    maxLength?: number
    /** When true, uses auto-height instead of full viewport height */
    compact?: boolean
    uploadComponentId?: string
    uploadFieldName?: string
}

export const ConfigurablePlugins = React.memo(function ConfigurablePlugins({
    enabledFeatures,
    disabledFeatures,
    disableAllFeatures,
    maxLength = 500,
    compact = false,
    uploadComponentId,
    uploadFieldName,
}: ConfigurablePluginsProps) {
    const [floatingAnchorElem, setFloatingAnchorElem] =
        useState<HTMLDivElement | null>(null)
    const [isLinkEditMode, setIsLinkEditMode] = useState<boolean>(false)

    const onRef = (_floatingAnchorElem: HTMLDivElement) => {
        if (_floatingAnchorElem !== null) {
            setFloatingAnchorElem(_floatingAnchorElem)
        }
    }

    // Determine which features are enabled
    const features = useMemo(() => {
        if (disableAllFeatures) {
            return new Set<PluginFeature>([])
        }

        if (enabledFeatures) {
            return new Set(enabledFeatures)
        }

        if (disabledFeatures) {
            return new Set(DEFAULT_FEATURES.filter(f => !disabledFeatures.includes(f)))
        }

        return new Set(DEFAULT_FEATURES)
    }, [enabledFeatures, disabledFeatures, disableAllFeatures])

    const isEnabled = (feature: PluginFeature) => features.has(feature)

    // If all features are disabled, show minimal editor
    if (disableAllFeatures) {
        return (
            <div className="relative">
                <RichTextPlugin
                    contentEditable={
                        <div className="relative">
                            <ContentEditable
                                placeholder={placeholder}
                                className={`ContentEditable__root relative block overflow-visible px-8 py-4 focus:outline-none bg-transparent ${compact ? 'min-h-32' : 'h-[calc(100vh-90px)] min-h-[500px]'}`}
                            />
                        </div>
                    }
                    ErrorBoundary={LexicalErrorBoundary}
                />
                {isEnabled('history') && <HistoryPlugin />}
            </div>
        )
    }

    return (
        <div className="relative">
            {isEnabled('fixedToolbar') && (
                <ToolbarPlugin>
                    {({ blockType }) => (
                        <ScrollArea className="w-full pb-2 cursor-e-resize border-b">
                            <div className="vertical-align-middle sticky top-0 z-10 flex min-w-max items-center gap-2 p-2 pb-0">
                                {isEnabled('history') && (
                                    <>
                                        <HistoryToolbarPlugin />
                                        <Separator orientation="vertical" className="!h-7" />
                                    </>
                                )}
                                <BlockFormatDropDown>
                                    {isEnabled('paragraph') && <FormatParagraph />}
                                    {isEnabled('heading') && <FormatHeading levels={["h1", "h2", "h3"]} />}
                                    {isEnabled('numberList') && <FormatNumberedList />}
                                    {isEnabled('bulletList') && <FormatBulletedList />}
                                    {isEnabled('checkList') && <FormatCheckList />}
                                    {isEnabled('codeBlock') && <FormatCodeBlock />}
                                    {isEnabled('quote') && <FormatQuote />}
                                </BlockFormatDropDown>
                                {blockType === "code" ? (
                                    isEnabled('codeHighlight') && <CodeLanguageToolbarPlugin />
                                ) : (
                                    <>
                                        {isEnabled('fontFamily') && <FontFamilyToolbarPlugin />}
                                        {isEnabled('fontSize') && <FontSizeToolbarPlugin />}
                                        <Separator orientation="vertical" className="!h-7" />
                                        <FontFormatToolbarPlugin />
                                        <Separator orientation="vertical" className="!h-7" />
                                        {(isEnabled('subscript') || isEnabled('superscript')) && (
                                            <>
                                                <SubSuperToolbarPlugin />
                                                <Separator orientation="vertical" className="!h-7" />
                                            </>
                                        )}
                                        {isEnabled('link') && (
                                            <>
                                                <LinkToolbarPlugin setIsLinkEditMode={setIsLinkEditMode} />
                                                <Separator orientation="vertical" className="!h-7" />
                                            </>
                                        )}
                                        {isEnabled('clearFormatting') && (
                                            <>
                                                <ClearFormattingToolbarPlugin />
                                                <Separator orientation="vertical" className="!h-7" />
                                            </>
                                        )}
                                        {(isEnabled('fontColor') || isEnabled('fontBackground')) && (
                                            <>
                                                {isEnabled('fontColor') && <FontColorToolbarPlugin />}
                                                {isEnabled('fontBackground') && <FontBackgroundToolbarPlugin />}
                                                <Separator orientation="vertical" className="!h-7" />
                                            </>
                                        )}
                                        {(isEnabled('alignLeft') || isEnabled('alignCenter') || isEnabled('alignRight') || isEnabled('alignJustify')) && (
                                            <>
                                                <ElementFormatToolbarPlugin />
                                                <Separator orientation="vertical" className="!h-7" />
                                            </>
                                        )}
                                        <BlockInsertPlugin>
                                            {isEnabled('horizontalRule') && <InsertHorizontalRule />}
                                            {isEnabled('image') && <InsertImage uploadComponentId={uploadComponentId} uploadFieldName={uploadFieldName} />}
                                            {isEnabled('table') && <InsertTable />}
                                            {isEnabled('columns') && <InsertColumnsLayout />}
                                            {(isEnabled('youtube') || isEnabled('twitter') || isEnabled('embeds')) && <InsertEmbeds />}
                                        </BlockInsertPlugin>
                                    </>
                                )}
                            </div>
                            <ScrollBar orientation="horizontal" className="h-2" />
                        </ScrollArea>
                    )}
                </ToolbarPlugin>
            )}
            <div className="relative">
                <RichTextPlugin
                    contentEditable={
                        <div className="relative">
                            <div className="relative" ref={onRef}>
                                <ContentEditable
                                    placeholder={placeholder}
                                    className={`ContentEditable__root relative block overflow-visible px-8 py-4 focus:outline-none bg-input ${compact ? 'min-h-[500px]' : 'h-[calc(100vh-90px)] min-h-72'}`}
                                />
                            </div>
                        </div>
                    }
                    ErrorBoundary={LexicalErrorBoundary}
                />

                {isEnabled('link') && <ClickableLinkPlugin />}
                {isEnabled('checkList') && <CheckListPlugin />}
                {isEnabled('horizontalRule') && <HorizontalRulePlugin />}
                {isEnabled('table') && (
                    <Suspense fallback={<PluginFallback />}>
                        <LazyTablePlugin />
                    </Suspense>
                )}
                {(isEnabled('bulletList') || isEnabled('numberList') || isEnabled('checkList')) && <ListPlugin />}
                <TabIndentationPlugin />
                {isEnabled('hashtags') && <HashtagPlugin />}
                {isEnabled('history') && <HistoryPlugin />}

                {isEnabled('mentions') && (
                    <Suspense fallback={<PluginFallback />}>
                        <LazyMentionsPlugin />
                    </Suspense>
                )}
                {isEnabled('draggableBlocks') && (
                    <Suspense fallback={<PluginFallback />}>
                        <LazyDraggableBlockPlugin anchorElem={floatingAnchorElem} />
                    </Suspense>
                )}
                {isEnabled('keywords') && <KeywordsPlugin />}
                {isEnabled('image') && (
                    <Suspense fallback={<PluginFallback />}>
                        <LazyImagesPlugin />
                    </Suspense>
                )}

                {isEnabled('columns') && (
                    <Suspense fallback={<PluginFallback />}>
                        <LazyLayoutPlugin />
                    </Suspense>
                )}

                {(isEnabled('youtube') || isEnabled('twitter') || isEnabled('embeds')) && (
                    <Suspense fallback={<PluginFallback />}>
                        <LazyAutoEmbedPlugin />
                        {isEnabled('twitter') && <LazyTwitterPlugin />}
                        {isEnabled('youtube') && <LazyYouTubePlugin />}
                    </Suspense>
                )}

                {isEnabled('codeHighlight') && (
                    <Suspense fallback={<PluginFallback />}>
                        <LazyCodeHighlightPlugin />
                        <LazyCodeActionMenuPlugin anchorElem={floatingAnchorElem} />
                    </Suspense>
                )}

                {isEnabled('markdown') && (
                    <MarkdownShortcutPlugin
                        transformers={[
                            TABLE,
                            HR,
                            IMAGE,
                            TWEET,
                            CHECK_LIST,
                            ...ELEMENT_TRANSFORMERS,
                            ...MULTILINE_ELEMENT_TRANSFORMERS,
                            ...TEXT_FORMAT_TRANSFORMERS,
                            ...TEXT_MATCH_TRANSFORMERS,
                        ]}
                    />
                )}
                <TabFocusPlugin />
                {isEnabled('variables') && <VariablesPlugin />}
                {isEnabled('link') && (
                    <>
                        <AutoLinkPlugin />
                        <LinkPlugin />
                    </>
                )}

                {isEnabled('componentPicker') && (
                    <ComponentPickerMenuPlugin
                        baseOptions={[
                            isEnabled('paragraph') && ParagraphPickerPlugin(),
                            isEnabled('heading') && HeadingPickerPlugin({ n: 1 }),
                            isEnabled('heading') && HeadingPickerPlugin({ n: 2 }),
                            isEnabled('heading') && HeadingPickerPlugin({ n: 3 }),
                            isEnabled('table') && TablePickerPlugin(),
                            isEnabled('checkList') && CheckListPickerPlugin(),
                            isEnabled('numberList') && NumberedListPickerPlugin(),
                            isEnabled('bulletList') && BulletedListPickerPlugin(),
                            isEnabled('quote') && QuotePickerPlugin(),
                            isEnabled('codeBlock') && CodePickerPlugin(),
                            isEnabled('horizontalRule') && DividerPickerPlugin(),
                            isEnabled('twitter') && EmbedsPickerPlugin({ embed: "tweet" }),
                            isEnabled('youtube') && EmbedsPickerPlugin({ embed: "youtube-video" }),
                            isEnabled('image') && ImagePickerPlugin(),
                            isEnabled('columns') && ColumnsLayoutPickerPlugin(),
                            (isEnabled('alignLeft') || isEnabled('alignCenter') || isEnabled('alignRight') || isEnabled('alignJustify')) && AlignmentPickerPlugin({ alignment: "left" }),
                            (isEnabled('alignLeft') || isEnabled('alignCenter') || isEnabled('alignRight') || isEnabled('alignJustify')) && AlignmentPickerPlugin({ alignment: "center" }),
                            (isEnabled('alignLeft') || isEnabled('alignCenter') || isEnabled('alignRight') || isEnabled('alignJustify')) && AlignmentPickerPlugin({ alignment: "right" }),
                            (isEnabled('alignLeft') || isEnabled('alignCenter') || isEnabled('alignRight') || isEnabled('alignJustify')) && AlignmentPickerPlugin({ alignment: "justify" }),
                        ].filter(Boolean) as any}
                        dynamicOptionsFn={isEnabled('table') ? DynamicTablePickerPlugin : undefined}
                    />
                )}

                {isEnabled('contextMenu') && <ContextMenuPlugin />}
                <DragDropPastePlugin
                    uploadComponentId={uploadComponentId}
                    uploadFieldName={uploadFieldName}
                />

                {isEnabled('link') && (
                    <>
                        <FloatingLinkEditorPlugin
                            anchorElem={floatingAnchorElem}
                            isLinkEditMode={isLinkEditMode}
                            setIsLinkEditMode={setIsLinkEditMode}
                        />
                    </>
                )}
                {isEnabled('floatingToolbar') && (
                    <FloatingTextFormatToolbarPlugin
                        anchorElem={floatingAnchorElem}
                        setIsLinkEditMode={setIsLinkEditMode}
                    />
                )}

                <ListMaxIndentLevelPlugin />
            </div>
            <ActionsPlugin>
                <ScrollArea className="w-full border-t rounded-b-lg">
                    <div className="clear-both flex min-w-max items-center justify-between gap-2 p-1">
                        <div className="flex flex-1 justify-start">
                            {isEnabled('maxLength') && (
                                <>
                                    <MaxLengthPlugin maxLength={maxLength} />
                                    <CharacterLimitPlugin maxLength={maxLength} charset="UTF-16" />
                                </>
                            )}
                        </div>
                        <div>
                            {isEnabled('characterCount') && <CounterCharacterPlugin charset="UTF-16" />}
                        </div>
                        <div className="flex flex-1 justify-end">
                            {isEnabled('speechToText') && (
                                <Suspense fallback={<PluginFallback />}>
                                    <LazySpeechToTextPlugin />
                                </Suspense>
                            )}
                            {isEnabled('importExport') && (
                                <Suspense fallback={<PluginFallback />}>
                                    <LazyImportExportPlugin />
                                </Suspense>
                            )}
                            {isEnabled('markdown') && (
                                <MarkdownTogglePlugin
                                    shouldPreserveNewLinesInMarkdown={true}
                                    transformers={[
                                        TABLE,
                                        HR,
                                        IMAGE,
                                        TWEET,
                                        CHECK_LIST,
                                        ...ELEMENT_TRANSFORMERS,
                                        ...MULTILINE_ELEMENT_TRANSFORMERS,
                                        ...TEXT_FORMAT_TRANSFORMERS,
                                        ...TEXT_MATCH_TRANSFORMERS,
                                    ]}
                                />
                            )}
                            <>
                                <ClearEditorActionPlugin />
                                <ClearEditorPlugin />
                            </>
                        </div>
                    </div>
                    <ScrollBar orientation="horizontal" className="h-2" />
                </ScrollArea>
            </ActionsPlugin>
        </div>
    )
})
