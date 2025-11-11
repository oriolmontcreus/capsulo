import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { SidebarMenuButton } from "@/components/ui/sidebar"

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
        <SidebarMenuButton
            onClick={toggleTheme}
            tooltip={{
                children: isDark ? "Switch to Light" : "Switch to Dark",
                hidden: false,
            }}
        >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            <span>{isDark ? "Light" : "Dark"}</span>
        </SidebarMenuButton>
    )
}