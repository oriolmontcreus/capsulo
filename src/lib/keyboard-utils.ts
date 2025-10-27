/**
 * Detects if the user is on a Mac/iOS device
 */
export function isMac(): boolean {
    if (typeof window === 'undefined') return false;

    return /Mac|iPhone|iPad|iPod/.test(navigator.platform) ||
        /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
}

/**
 * Formats a keyboard shortcut string to show the correct modifier key
 * based on the user's operating system.
 * 
 * @param shortcut - Shortcut string with Mac symbols (⌘, ⇧, ⌥, ⌃)
 * @returns Formatted shortcut string for the current OS
 * 
 * @example
 * formatShortcut("⌘+B") // Returns "Cmd+B" on Mac, "Ctrl+B" on Windows
 * formatShortcut("⌘+⇧+M") // Returns "Cmd+Shift+M" on Mac, "Ctrl+Shift+M" on Windows
 */
export function formatShortcut(shortcut: string): string {
    if (isMac()) {
        // On Mac, convert symbols to readable text
        return shortcut
            .replace(/⌘/g, 'Cmd')
            .replace(/⇧/g, 'Shift')
            .replace(/⌥/g, 'Option')
            .replace(/⌃/g, 'Control');
    } else {
        // On Windows/Linux, convert to Ctrl
        return shortcut
            .replace(/⌘/g, 'Ctrl')
            .replace(/⇧/g, 'Shift')
            .replace(/⌥/g, 'Alt')
            .replace(/⌃/g, 'Ctrl');
    }
}
