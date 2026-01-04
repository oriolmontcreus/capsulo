"use client"

import type { JSX } from "react"
import { useState } from "react"
import type { LexicalEditor } from "lexical"

import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { INSERT_LAYOUT_COMMAND } from "./layout-commands"

const LAYOUTS = [
    { label: "2 columns (equal width)", value: "1fr 1fr" },
    { label: "2 columns (25% - 75%)", value: "1fr 3fr" },
    { label: "3 columns (equal width)", value: "1fr 1fr 1fr" },
    { label: "3 columns (25% - 50% - 25%)", value: "1fr 2fr 1fr" },
    { label: "4 columns (equal width)", value: "1fr 1fr 1fr 1fr" },
]

export function InsertLayoutDialog({
    activeEditor,
    onClose,
}: {
    activeEditor: LexicalEditor
    onClose: () => void
}): JSX.Element {
    const [layout, setLayout] = useState(LAYOUTS[0].value)
    const buttonLabel = LAYOUTS.find((item) => item.value === layout)?.label

    const onClick = () => {
        activeEditor.dispatchCommand(INSERT_LAYOUT_COMMAND, layout)
        onClose()
    }

    return (
        <>
            <Select onValueChange={setLayout} defaultValue={layout}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder={buttonLabel} />
                </SelectTrigger>
                <SelectContent className="w-full">
                    {LAYOUTS.map(({ label, value }) => (
                        <SelectItem key={value} value={value}>
                            {label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button onClick={onClick}>Insert</Button>
        </>
    )
}
