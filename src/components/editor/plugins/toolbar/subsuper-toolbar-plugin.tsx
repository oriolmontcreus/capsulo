import { useState } from "react"
import { $isTableSelection } from "@lexical/table"
import { $isRangeSelection, type BaseSelection, FORMAT_TEXT_COMMAND } from "lexical"
import { SubscriptIcon, SuperscriptIcon } from "lucide-react"

import { useToolbarContext } from "@/components/editor/context/toolbar-context"
import { useUpdateToolbarHandler } from "@/components/editor/editor-hooks/use-update-toolbar"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function SubSuperToolbarPlugin() {
  const { activeEditor } = useToolbarContext()
  const [isSubscript, setIsSubscript] = useState(false)
  const [isSuperscript, setIsSuperscript] = useState(false)

  const $updateToolbar = (selection: BaseSelection) => {
    if ($isRangeSelection(selection) || $isTableSelection(selection)) {
      // @ts-ignore
      setIsSubscript(selection.hasFormat("subscript"))
      // @ts-ignore
      setIsSuperscript(selection.hasFormat("superscript"))
    }
  }

  useUpdateToolbarHandler($updateToolbar)

  return (
    <TooltipProvider>
      <ToggleGroup
        type="single"
        defaultValue={
          isSubscript ? "subscript" : isSuperscript ? "superscript" : ""
        }
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem
              value="subscript"
              size="sm"
              aria-label="Toggle subscript"
              onClick={() => {
                activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, "subscript")
              }}
              variant={"outline"}
            >
              <SubscriptIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>
            <p>Subscript</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem
              value="superscript"
              size="sm"
              aria-label="Toggle superscript"
              onClick={() => {
                activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, "superscript")
              }}
              variant={"outline"}
            >
              <SuperscriptIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>
            <p>Superscript</p>
          </TooltipContent>
        </Tooltip>
      </ToggleGroup>
    </TooltipProvider>
  )
}
