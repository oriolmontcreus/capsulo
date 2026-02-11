import React from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePreferences } from "@/hooks/use-preferences";

const WIDTH_REGEX = /^\d+px$|^\d+%$/;
const PX_REGEX = /^(\d+)px$/;

const PRESET_WIDTHS = [
  { label: "XXS", value: "675px", fullLabel: "Extra Extra Small (665px)" },
  { label: "XS", value: "768px", fullLabel: "Extra Small (758px)" },
  { label: "S", value: "896px", fullLabel: "Small (886px)" },
  { label: "SM", value: "1024px", fullLabel: "Small Medium (1014px)" },
  { label: "M", value: "1152px", fullLabel: "Medium (1142px)" },
  { label: "MD", value: "1280px", fullLabel: "Medium Large (1270px)" },
  { label: "LG", value: "1400px", fullLabel: "Large (1390px)" },
  { label: "XL", value: "1600px", fullLabel: "Extra Large (1590px)" },
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
      const isValid = WIDTH_REGEX.test(customWidth.trim());
      if (isValid) {
        setPreferences({ contentMaxWidth: customWidth.trim() });
      } else {
        console.warn("Please enter a valid width (e.g., 1200px or 100%)");
      }
    }
  };

  // Calculate width percentage for visual preview (max 100%)
  const getPreviewWidth = () => {
    if (preferences.contentMaxWidth === "100%") {
      return "100%";
    }
    const match = preferences.contentMaxWidth.match(PX_REGEX);
    if (match) {
      const pixels = Number.parseInt(match[1], 10);
      // Scale to a max visual width (1600px = 100% of preview)
      const percentage = Math.min((pixels / 1600) * 100, 100);
      return `${percentage}%`;
    }
    return "87.5%"; // Default 1400px
  };

  return (
    <section className="space-y-6">
      <div>
        <h3 className="font-medium text-lg">Content Max Width</h3>
        <p className="text-muted-foreground text-sm">
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
                title={preset.fullLabel}
                variant={
                  preferences.contentMaxWidth === preset.value
                    ? "default"
                    : "outline"
                }
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
          <Label className="text-sm" htmlFor="custom-width">
            Custom width
          </Label>
          <div className="flex gap-2">
            <div>
              <Input
                className="max-w-xs"
                id="custom-width"
                onChange={(e) => setCustomWidth(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCustomWidthApply();
                  }
                }}
                placeholder="e.g., 1500px or 90%"
                value={customWidth}
              />
            </div>
            <Button onClick={handleCustomWidthApply}>Apply</Button>
          </div>
        </div>

        {/* Current Value Display */}
        {!PRESET_WIDTHS.some(
          (p) => p.value === preferences.contentMaxWidth
        ) && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
            <p className="font-medium text-amber-900 text-sm dark:text-amber-100">
              Custom width active
            </p>
            <p className="text-amber-700 text-sm dark:text-amber-300">
              {preferences.contentMaxWidth}
            </p>
          </div>
        )}
      </div>
      {/* Visual Preview */}
      <div className="rounded-lg border bg-muted/30 p-6">
        <div className="mx-auto max-w-full">
          <div
            className="mx-auto h-32 rounded-md bg-neutral-300 transition-all duration-500 ease-out dark:bg-neutral-700"
            style={{ width: getPreviewWidth() }}
          >
            <div className="flex h-full items-center justify-center">
              <span className="font-medium text-sm text-white">
                {preferences.contentMaxWidth}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
