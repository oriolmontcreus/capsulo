import { Kbd, KbdGroup } from "@/components/ui/kbd";

const shortcuts = [
    {
        label: "Toggle left sidebar",
        description: "Show or hide the left navigation sidebar",
        keys: ["Ctrl", "B"],
    },
    {
        label: "Save CMS data",
        description: "Save all changes to the CMS",
        keys: ["Ctrl", "S"],
    },
    {
        label: "Navigate to next field",
        description: "Move focus to the next form field",
        keys: ["Tab"],
    },
    {
        label: "Navigate to previous field",
        description: "Move focus to the previous form field",
        keys: ["Shift", "Tab"],
    },
];

export function ShortcutsPreferences() {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Keyboard Shortcuts</h3>
                <p className="text-sm text-muted-foreground">
                    Learn the keyboard shortcuts to work more efficiently
                </p>
            </div>

            <div className="space-y-4">
                {shortcuts.map((shortcut) => (
                    <div key={shortcut.label} className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                            <div className="text-sm font-medium">
                                {shortcut.label}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {shortcut.description}
                            </p>
                        </div>
                        <KbdGroup>
                            {shortcut.keys.map((key, index) => (
                                <Kbd key={index}>{key}</Kbd>
                            ))}
                        </KbdGroup>
                    </div>
                ))}
            </div>
        </div>
    );
}
