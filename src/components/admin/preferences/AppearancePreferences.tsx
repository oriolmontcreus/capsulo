import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { usePreferences } from "@/hooks/use-preferences";

const PRESET_WIDTHS = [
    { label: "XS", value: "768px", fullLabel: "Extra Small (768px)" },
    { label: "SM", value: "1024px", fullLabel: "Small (1024px)" },
    { label: "MD", value: "1280px", fullLabel: "Medium (1280px)" },
    { label: "LG", value: "1400px", fullLabel: "Large (1400px)" },
    { label: "XL", value: "1600px", fullLabel: "Extra Large (1600px)" },
    { label: "Full", value: "100%", fullLabel: "Full Width" },
];

export function AppearancePreferences() {
    const { preferences, setPreferences } = usePreferences();
    const [customWidth, setCustomWidth] = React.useState("");

    React.useEffect(() => {
        const isPreset = PRESET_WIDTHS.some(
            (preset) => preset.value === preferences.contentMaxWidth
        );
        if (!isPreset) {
            setCustomWidth(preferences.contentMaxWidth);
        }
    }, [preferences.contentMaxWidth]);

    const handlePresetSelect = (value: string) => {
        setPreferences({ contentMaxWidth: value });
        setCustomWidth(""); // Clear custom input when preset is selected
    };

    const handleCustomWidthApply = () => {
        if (customWidth.trim()) {
            const isValid = /^\d+px$|^\d+%$/.test(customWidth.trim());
            if (isValid) {
                setPreferences({ contentMaxWidth: customWidth.trim() });
            } else {
                alert("Please enter a valid width (e.g., 1200px or 100%)");
            }
        }
    };

    // Calculate width percentage for visual preview (max 100%)
    const getPreviewWidth = () => {
        if (preferences.contentMaxWidth === "100%") return "100%";
        const match = preferences.contentMaxWidth.match(/^(\d+)px$/);
        if (match) {
            const pixels = parseInt(match[1]);
            // Scale to a max visual width (1600px = 100% of preview)
            const percentage = Math.min((pixels / 1600) * 100, 100);
            return `${percentage}%`;
        }
        return "87.5%"; // Default 1400px
    };

    return (
        <section className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Content Max Width</h3>
                <p className="text-sm text-muted-foreground">
                    Set the maximum width for the main content area
                </p>
            </div>

            <div className="space-y-4 overflow-visible">

                {/* Preset Buttons */}
                <div className="space-y-2">
                    <Label className="text-sm">Choose a preset</Label>
                    <ButtonGroup>
                        {PRESET_WIDTHS.map((preset) => (
                            <Button
                                key={preset.value}
                                onClick={() => handlePresetSelect(preset.value)}
                                size="sm"
                                variant={
                                    preferences.contentMaxWidth === preset.value
                                        ? "default"
                                        : "outline"
                                }
                                title={preset.fullLabel}
                            >
                                {preset.label}
                            </Button>
                        ))}
                    </ButtonGroup>
                </div>

                {/* Divider with OR */}
                <div className="relative mt-6">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                            Or use custom
                        </span>
                    </div>
                </div>

                {/* Custom Width Input */}
                <div className="space-y-2">
                    <Label htmlFor="custom-width" className="text-sm">
                        Custom width
                    </Label>
                    <div className="flex gap-2">
                        <div>
                            <Input
                                id="custom-width"
                                placeholder="e.g., 1500px or 90%"
                                value={customWidth}
                                onChange={(e) => setCustomWidth(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleCustomWidthApply();
                                }}
                                className="max-w-xs"
                            />
                        </div>
                        <Button onClick={handleCustomWidthApply}>
                            Apply
                        </Button>
                    </div>
                </div>

                {/* Current Value Display */}
                {!PRESET_WIDTHS.some((p) => p.value === preferences.contentMaxWidth) && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                            Custom width active
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                            {preferences.contentMaxWidth}
                        </p>
                    </div>
                )}
            </div>
            {/* Visual Preview */}
            <div className="rounded-lg border bg-muted/30 p-6">
                <div className="mx-auto max-w-full">
                    <div
                        className="h-32 mx-auto rounded-md bg-neutral-300 dark:bg-neutral-700 transition-all duration-500 ease-out"
                        style={{ width: getPreviewWidth() }}
                    >
                        <div className="flex h-full items-center justify-center">
                            <span className="text-sm font-medium text-white">
                                {preferences.contentMaxWidth}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
