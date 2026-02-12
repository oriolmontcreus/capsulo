import type { ChangeItem } from "./types";

/**
 * Formats staged changes into a human-readable description for AI processing
 */
export function formatStagedChanges(
  pagesWithChanges: ChangeItem[],
  globalsHasChanges: boolean
): string {
  const changes: string[] = [];

  if (pagesWithChanges.length > 0) {
    changes.push(
      `Modified pages: ${pagesWithChanges.map((p) => p.name).join(", ")}`
    );
  }

  if (globalsHasChanges) {
    changes.push("Modified global settings");
  }

  if (changes.length === 0) {
    return "No changes detected";
  }

  return changes.join("; ");
}
