import { Brain, ChevronDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AIMode } from "@/lib/ai/modelConfig";
import { MODE_LABELS } from "@/lib/ai/modelConfig";

interface ModeSelectorProps {
  mode: AIMode;
  onModeChange: (mode: AIMode) => void;
  disabled?: boolean;
}

export function ModeSelector({
  mode,
  onModeChange,
  disabled = false,
}: ModeSelectorProps) {
  const currentMode = MODE_LABELS[mode];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-7 gap-1 px-2 text-xs"
                disabled={disabled}
                size="sm"
                variant="ghost"
              >
                {mode === "fast" ? (
                  <Zap className="h-3.5 w-3.5 text-yellow-500" />
                ) : (
                  <Brain className="h-3.5 w-3.5 text-blue-500" />
                )}
                <span className="hidden sm:inline">{currentMode.label}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="gap-2"
                onClick={() => onModeChange("fast")}
              >
                <Zap className="h-4 w-4 text-yellow-500" />
                <div className="flex flex-col">
                  <span className="font-medium">Fast</span>
                  <span className="text-muted-foreground text-xs">
                    Quick responses, 24K context
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2"
                onClick={() => onModeChange("smart")}
              >
                <Brain className="h-4 w-4 text-blue-500" />
                <div className="flex flex-col">
                  <span className="font-medium">Smart</span>
                  <span className="text-muted-foreground text-xs">
                    Deep reasoning, 131K context
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{currentMode.description}</p>
          <p className="text-muted-foreground text-xs">
            {mode === "fast" ? "24K context window" : "131K context window"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
