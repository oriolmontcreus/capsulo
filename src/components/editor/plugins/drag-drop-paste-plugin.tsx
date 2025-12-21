"use client"

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { useEffect } from "react"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { DRAG_DROP_PASTE } from "@lexical/rich-text"
import { isMimeType } from "@lexical/utils"
import { COMMAND_PRIORITY_LOW } from "lexical"

import { INSERT_IMAGE_COMMAND } from "@/components/editor/plugins/images-plugin"

const ACCEPTABLE_IMAGE_TYPES = [
  "image/",
  "image/heic",
  "image/heif",
  "image/gif",
  "image/webp",
]

import { useUploadManager } from "@/lib/form-builder/fields/FileUpload/uploadManager"

interface DragDropPastePluginProps {
  uploadComponentId?: string
  uploadFieldName?: string
}

export function DragDropPastePlugin({
  uploadComponentId,
  uploadFieldName,
}: DragDropPastePluginProps): null {
  const [editor] = useLexicalComposerContext()
  const uploadManager = useUploadManager()

  useEffect(() => {
    return editor.registerCommand(
      DRAG_DROP_PASTE,
      (files) => {
        ; (async () => {
          for (const file of files) {
            if (isMimeType(file, ACCEPTABLE_IMAGE_TYPES)) {
              try {
                // Queue upload even if context is missing (UploadManager supports optional context)
                const { id, preview } = await uploadManager.queueUpload(file, uploadComponentId, uploadFieldName)

                if (!preview) {
                  throw new Error("Failed to generate preview")
                }

                editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
                  altText: file.name,
                  src: preview,
                  uploadId: id
                })
              } catch (error) {
                console.error("Failed to queue drag/drop upload:", error)
                // Fallback to base64 inline
                const reader = new FileReader()
                reader.onload = () => {
                  if (typeof reader.result === "string") {
                    editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
                      altText: file.name,
                      src: reader.result,
                    })
                  }
                }
                reader.readAsDataURL(file)
              }
            }
          }
        })()
        return true
      },
      COMMAND_PRIORITY_LOW
    )
  }, [editor, uploadComponentId, uploadFieldName, uploadManager])
  return null
}
