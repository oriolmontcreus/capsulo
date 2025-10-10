import * as React from "react"
import { Moon, Sun } from "lucide-react"

import {
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

export function ModeToggle() {
    const [isDark, setIsDark] = React.useState(false)

    React.useEffect(() => {
        const isDarkMode = document.documentElement.classList.contains("dark")
        setIsDark(isDarkMode)
    }, [])

    const toggleTheme = () => {
        const newIsDark = !isDark
        setIsDark(newIsDark)
        document.documentElement.classList[newIsDark ? "add" : "remove"]("dark")
    }

    return (
        <DropdownMenuItem onClick={toggleTheme}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDark ? "Switch to Light" : "Switch to Dark"}
        </DropdownMenuItem>
    )
}