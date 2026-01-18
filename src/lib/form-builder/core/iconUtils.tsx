import React from "react";
import { cn } from "@/lib/utils";

/**
 * Common utility to style schema icons across the admin interface.
 * Ensures icons have a consistent size but preserves their custom colors if provided.
 */
export function getStyledSchemaIcon(
  icon: React.ReactNode, 
  defaultIcon: React.ReactNode, 
  customClassName?: string
) {
  const targetIcon = icon || defaultIcon;
  
  if (!targetIcon) return null;
  
  if (React.isValidElement(targetIcon)) {
    const props = targetIcon.props as any;
    
    // Core styling that should be applied to all icons
    const baseClasses = "size-4 flex-shrink-0";
    
    // We only add text-primary if the icon doesn't already HAVE a specific text color class
    const hasColorClass = props.className && /text-(?:[a-z]+-\d+|[a-z]+)/.test(props.className);
    
    return React.cloneElement(targetIcon as React.ReactElement<any>, {
      className: cn(
        baseClasses,
        !hasColorClass && "text-primary",
        props.className,
        customClassName
      )
    });
  }
  
  return targetIcon;
}
