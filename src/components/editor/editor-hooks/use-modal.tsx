import type { JSX } from "react"
import { useCallback, useMemo, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function useEditorModal(): [
  JSX.Element | null,
  (title: string, showModal: (onClose: () => void) => JSX.Element) => void,
] {
  const [modalContent, setModalContent] = useState<null | {
    closeOnClickOutside: boolean
    content: JSX.Element
    title: string
  }>(null)

  const onClose = useCallback(() => {
    setModalContent(null)
  }, [])

  const modal = useMemo(() => {
    if (modalContent === null) {
      return null
    }
    const { title, content } = modalContent
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            const dialogContent = e.currentTarget as HTMLElement
            setTimeout(() => {
              const focusable = dialogContent?.querySelector<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
              )
              focusable?.focus()
            }, 0)
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <DialogDescription className="sr-only">{title}</DialogDescription>
          {content}
        </DialogContent>
      </Dialog>
    )
  }, [modalContent, onClose])

  const showModal = useCallback(
    (
      title: string,
      getContent: (onClose: () => void) => JSX.Element,
      closeOnClickOutside = false
    ) => {
      setModalContent({
        closeOnClickOutside,
        content: getContent(onClose),
        title,
      })
    },
    [onClose]
  )

  return [modal, showModal]
}
