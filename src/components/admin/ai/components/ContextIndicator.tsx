import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ContextIndicatorProps {
  percentage: number; // 0 to 1
  size?: number;
}

export function ContextIndicator({
  percentage,
  size = 20,
}: ContextIndicatorProps) {
  // Clamp percentage between 0 and 1
  const clampedPercentage = Math.min(Math.max(percentage, 0), 1);
  const displayPercentage = Math.round(clampedPercentage * 100);

  // Calculate stroke color based on percentage
  let strokeColor = "stroke-green-500";
  if (clampedPercentage >= 1) {
    strokeColor = "stroke-red-500";
  } else if (clampedPercentage >= 0.8) {
    strokeColor = "stroke-yellow-500";
  }

  // Calculate circle properties
  const strokeWidth = 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - clampedPercentage * circumference;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative inline-flex items-center justify-center">
            <svg
              aria-label={`Context usage: ${displayPercentage}%`}
              className="-rotate-90 transform"
              height={size}
              width={size}
            >
              <title>Context usage: {displayPercentage}%</title>
              {/* Background circle */}
              <circle
                className="stroke-muted"
                cx={size / 2}
                cy={size / 2}
                fill="none"
                r={radius}
                strokeWidth={strokeWidth}
              />
              {/* Progress circle */}
              <circle
                className={`${strokeColor} transition-all duration-300`}
                cx={size / 2}
                cy={size / 2}
                fill="none"
                r={radius}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                strokeWidth={strokeWidth}
              />
            </svg>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Context window: {displayPercentage}% full</p>
          {clampedPercentage >= 0.8 && (
            <p className="text-xs text-yellow-500">
              Approaching limit - consider switching to Smart mode
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
