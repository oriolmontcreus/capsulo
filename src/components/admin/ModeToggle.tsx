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

        // Inject animation styles for this specific transition
        const styleId = `theme-transition-${Date.now()}`
        const style = document.createElement('style')
        style.id = styleId

        // Circle blur expand animation from bottom left
        const css = `
            @supports (view-transition-name: root) {
                ::view-transition-old(root) {
                    animation: none;
                }
                ::view-transition-new(root) {
                    animation: circle-blur-expand 0.5s ease-out;
                    transform-origin: bottom left;
                    filter: blur(0);
                }
                @keyframes circle-blur-expand {
                    from {
                        clip-path: circle(0% at 0% 100%);
                        filter: blur(4px);
                    }
                    to {
                        clip-path: circle(150% at 0% 100%);
                        filter: blur(0);
                    }
                }
            }
        `

        style.textContent = css
        document.head.appendChild(style)

        // Clean up animation styles after transition
        setTimeout(() => {
            const styleEl = document.getElementById(styleId)
            if (styleEl) {
                styleEl.remove()
            }
        }, 1000)

        // Use View Transitions API if available
        const updateTheme = () => {
            setIsDark(newIsDark)
            document.documentElement.classList[newIsDark ? "add" : "remove"]("dark")
        }

        if ('startViewTransition' in document) {
            (document as any).startViewTransition(updateTheme)
        } else {
            updateTheme()
        }
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
