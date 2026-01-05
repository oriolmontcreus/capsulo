"use client"

import type { JSX } from "react"
import { useEffect, useRef, useState } from "react"
import * as React from "react"
import { type LexicalEditor } from "lexical"

import { CAN_USE_DOM } from "@/components/editor/shared/can-use-dom"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"

import { useUploadManager } from "@/lib/form-builder/fields/FileUpload/uploadManager"
import { INSERT_IMAGE_COMMAND, type InsertImagePayload } from "./image-commands"

const getDOMSelection = (targetWindow: Window | null): Selection | null =>
    CAN_USE_DOM ? (targetWindow || window).getSelection() : null

export function InsertImageUriDialogBody({
    onClick,
}: {
    onClick: (payload: InsertImagePayload) => void
}) {
    const [src, setSrc] = useState("")
    const [altText, setAltText] = useState("")

    const isDisabled = src === ""

    return (
        <div className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="image-url">Image URL</Label>
                <Input
                    id="image-url"
                    placeholder="i.e. https://source.unsplash.com/random"
                    onChange={(e) => setSrc(e.target.value)}
                    value={src}
                    data-test-id="image-modal-url-input"
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="alt-text">Alt Text</Label>
                <Input
                    id="alt-text"
                    placeholder="Random unsplash image"
                    onChange={(e) => setAltText(e.target.value)}
                    value={altText}
                    data-test-id="image-modal-alt-text-input"
                />
            </div>
            <DialogFooter>
                <Button
                    type="submit"
                    disabled={isDisabled}
                    onClick={() => onClick({ altText, src })}
                    data-test-id="image-modal-confirm-btn"
                >
                    Confirm
                </Button>
            </DialogFooter>
        </div>
    )
}

export function InsertImageUploadedDialogBody({
    onClick,
    uploadComponentId,
    uploadFieldName,
}: {
    onClick: (payload: InsertImagePayload) => void
    uploadComponentId?: string
    uploadFieldName?: string
}) {
    const [src, setSrc] = useState("")
    const [altText, setAltText] = useState("")
    const [uploadId, setUploadId] = useState<string | undefined>()
    const uploadManager = useUploadManager()
    const currentUploadRef = useRef<{
        id?: string
        token: object
        tempUrl?: string
    } | null>(null)

    useEffect(() => {
        return () => {
            if (currentUploadRef.current?.tempUrl) {
                URL.revokeObjectURL(currentUploadRef.current.tempUrl)
            }
        }
    }, [])

    const isDisabled = src === ""

    const loadImage = async (files: FileList | null) => {
        if (!files || files.length === 0) return

        const file = files[0]
        const token = {}

        // Cleanup previous upload if it exists
        if (currentUploadRef.current) {
            if (currentUploadRef.current.id) {
                uploadManager.removeOperation(currentUploadRef.current.id)
            }
            if (currentUploadRef.current.tempUrl) {
                URL.revokeObjectURL(currentUploadRef.current.tempUrl)
            }
        }

        const tempUrl = URL.createObjectURL(file)
        currentUploadRef.current = { token, tempUrl }

        if (!altText) setAltText(file.name)
        setSrc(tempUrl)
        setUploadId(undefined)

        // Always try to use upload manager first
        try {
            // Upload manager handles optional context
            const { id, preview } = await uploadManager.queueUpload(
                file,
                uploadComponentId,
                uploadFieldName
            )

            // Prevent race conditions
            if (currentUploadRef.current?.token !== token) {
                if (id) uploadManager.removeOperation(id)
                return
            }

            currentUploadRef.current.id = id
            setUploadId(id)

            if (preview) {
                setSrc(preview)
                URL.revokeObjectURL(tempUrl)
                if (currentUploadRef.current) {
                    currentUploadRef.current.tempUrl = undefined
                }
            }
            // If no preview but we have an id, keep the tempUrl visible (don't throw)
        } catch (error) {
            if (currentUploadRef.current?.token !== token) return

            console.error("Failed to queue upload:", error)

            // Cleanup temp URL
            URL.revokeObjectURL(tempUrl)
            if (currentUploadRef.current) {
                currentUploadRef.current.tempUrl = undefined
                currentUploadRef.current.id = undefined
            }

            setUploadId(undefined)

            // Fallback to base64 if upload fails
            const reader = new FileReader()
            reader.onload = function () {
                if (currentUploadRef.current?.token !== token) return
                if (typeof reader.result === "string") {
                    setSrc(reader.result)
                }
            }
            reader.readAsDataURL(file)
        }
    }

    return (
        <div className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="image-upload">Image Upload</Label>
                <Input
                    id="image-upload"
                    type="file"
                    onChange={(e) => loadImage(e.target.files)}
                    accept="image/*"
                    data-test-id="image-modal-file-upload"
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="alt-text">Alt Text</Label>
                <Input
                    id="alt-text"
                    placeholder="Descriptive alternative text"
                    onChange={(e) => setAltText(e.target.value)}
                    value={altText}
                    data-test-id="image-modal-alt-text-input"
                />
            </div>
            <Button
                type="submit"
                disabled={isDisabled}
                onClick={() => onClick({ altText, src, uploadId })}
                data-test-id="image-modal-file-upload-btn"
            >
                Confirm
            </Button>
        </div>
    )
}

export function InsertImageDialog({
    activeEditor,
    onClose,
    uploadComponentId,
    uploadFieldName,
}: {
    activeEditor: LexicalEditor
    onClose: () => void
    uploadComponentId?: string
    uploadFieldName?: string
}): JSX.Element {
    const hasModifier = useRef(false)

    useEffect(() => {
        hasModifier.current = false
        const handler = (e: KeyboardEvent) => {
            hasModifier.current = e.altKey
        }
        document.addEventListener("keydown", handler)
        return () => {
            document.removeEventListener("keydown", handler)
        }
    }, [activeEditor])

    const onClick = (payload: InsertImagePayload) => {
        activeEditor.dispatchCommand(INSERT_IMAGE_COMMAND, payload)
        onClose()
    }

    return (
        <Tabs defaultValue="url">
            <TabsList className="w-full">
                <TabsTrigger value="url" className="w-full">
                    URL
                </TabsTrigger>
                <TabsTrigger value="file" className="w-full">
                    File
                </TabsTrigger>
            </TabsList>
            <TabsContent value="url">
                <InsertImageUriDialogBody onClick={onClick} />
            </TabsContent>
            <TabsContent value="file">
                <InsertImageUploadedDialogBody
                    onClick={onClick}
                    uploadComponentId={uploadComponentId}
                    uploadFieldName={uploadFieldName}
                />
            </TabsContent>
        </Tabs>
    )
}
