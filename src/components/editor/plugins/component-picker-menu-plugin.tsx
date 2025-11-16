import type { JSX } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { useBasicTypeaheadTriggerMatch, LexicalTypeaheadMenuPlugin } from "@lexical/react/LexicalTypeaheadMenuPlugin"
import { TextNode } from "lexical"
import { createPortal } from "react-dom"

import { useEditorModal } from "@/components/editor/editor-hooks/use-modal"
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

import { ComponentPickerOption } from "./picker/component-picker-option"

export function ComponentPickerMenuPlugin({
  baseOptions = [],
  dynamicOptionsFn,
}: {
  baseOptions?: Array<ComponentPickerOption>
  dynamicOptionsFn?: ({
    queryString,
  }: {
    queryString: string
  }) => Array<ComponentPickerOption>
}): JSX.Element {
  const [editor] = useLexicalComposerContext()
  const [modal, showModal] = useEditorModal()
  const [queryString, setQueryString] = useState<string | null>(null)

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch("/", {
    minLength: 0,
  })

  const options = useMemo(() => {
    if (!queryString) {
      return baseOptions
    }

    const regex = new RegExp(queryString, "i")

    return [
      ...(dynamicOptionsFn?.({ queryString }) || []),
      ...baseOptions.filter(
        (option) =>
          regex.test(option.title) ||
          option.keywords.some((keyword) => regex.test(keyword))
      ),
    ]
  }, [editor, queryString, showModal])

  const onSelectOption = useCallback(
    (
      selectedOption: ComponentPickerOption,
      nodeToRemove: TextNode | null,
      closeMenu: () => void,
      matchingString: string
    ) => {
      editor.update(() => {
        nodeToRemove?.remove()
        selectedOption.onSelect(matchingString, editor, showModal)
        closeMenu()
      })
    },
    [editor]
  )

  return (
    <>
      {modal}
      <LexicalTypeaheadMenuPlugin
        onQueryChange={setQueryString}
        onSelectOption={onSelectOption}
        triggerFn={checkForTriggerMatch}
        options={options}
        menuRenderFn={(
          anchorElementRef,
          { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }
        ) => {
          const commandListRef = useRef<HTMLDivElement>(null)

          // Auto-scroll to selected item
          useEffect(() => {
            if (selectedIndex !== null && commandListRef.current) {
              const selectedElement = commandListRef.current.querySelector(`[data-index="${selectedIndex}"]`)
              if (selectedElement) {
                selectedElement.scrollIntoView({
                  behavior: 'smooth',
                  block: 'nearest'
                })
              }
            }
          }, [selectedIndex])

          return anchorElementRef.current && options.length
            ? createPortal(
              <div className="absolute z-[9999] w-[250px] max-h-[300px] rounded-md border bg-popover shadow-md overflow-hidden">
                <Command
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp") {
                      e.preventDefault()
                      setHighlightedIndex(
                        selectedIndex !== null
                          ? (selectedIndex - 1 + options.length) % options.length
                          : options.length - 1
                      )
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault()
                      setHighlightedIndex(
                        selectedIndex !== null
                          ? (selectedIndex + 1) % options.length
                          : 0
                      )
                    }
                  }}
                >
                  <CommandList ref={commandListRef} className="max-h-[300px] overflow-y-auto">
                    <CommandGroup>
                      {options.map((option, index) => (
                        <CommandItem
                          key={option.key}
                          value={option.title}
                          data-index={index}
                          onSelect={() => {
                            selectOptionAndCleanUp(option)
                          }}
                          className={`flex items-center gap-2 ${selectedIndex === index
                            ? "bg-accent text-accent-foreground"
                            : ""
                            }`}
                        >
                          {option.icon}
                          {option.title}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>,
              anchorElementRef.current
            )
            : null
        }}
      />
    </>
  )
}
