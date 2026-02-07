/**
 * AI Mode Configuration
 * Global state management for AI mode selection (Fast/Smart)
 */

export enum AIMode {
  FAST = "fast",
  SMART = "smart",
}

// Model IDs for Cloudflare Workers AI
export const AI_MODELS = {
  [AIMode.FAST]: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  [AIMode.SMART]: "@cf/meta/llama-4-scout-17b-16e-instruct",
  vision: "@cf/meta/llama-4-scout-17b-16e-instruct", // Always use Scout for vision
} as const;

// Context window limits (in tokens)
export const CONTEXT_LIMITS = {
  [AIMode.FAST]: 24_000,
  [AIMode.SMART]: 131_000,
} as const;

// Warning threshold (80%)
export const WARNING_THRESHOLD = 0.8;

// Storage key
const STORAGE_KEY = "capsulo-ai-mode";
const MODE_CHANGE_EVENT = "capsulo-ai-mode-changed";

// Mode display names
export const MODE_LABELS: Record<
  AIMode,
  { label: string; description: string; icon: string }
> = {
  [AIMode.FAST]: {
    label: "Fast",
    description: "Quick responses for most tasks",
    icon: "⚡",
  },
  [AIMode.SMART]: {
    label: "Smart",
    description: "Deep reasoning & large context",
    icon: "🧠",
  },
};

// Get model based on mode and attachments
export function getModelForRequest(
  mode: AIMode,
  hasAttachments: boolean
): string {
  if (hasAttachments) {
    return AI_MODELS.vision;
  }
  return mode === AIMode.FAST ? AI_MODELS[AIMode.FAST] : AI_MODELS[AIMode.SMART];
}

// Get context window limit for a mode
export function getContextLimit(mode: AIMode): number {
  return mode === AIMode.FAST ? CONTEXT_LIMITS[AIMode.FAST] : CONTEXT_LIMITS[AIMode.SMART];
}

// Get current mode from localStorage
export function getStoredMode(): AIMode {
  if (typeof window === "undefined") return AIMode.FAST;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === AIMode.SMART ? AIMode.SMART : AIMode.FAST;
  } catch {
    return AIMode.FAST;
  }
}

// Save mode to localStorage
export function setStoredMode(mode: AIMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
    // Dispatch event for cross-tab and same-tab updates
    window.dispatchEvent(new CustomEvent(MODE_CHANGE_EVENT, { detail: mode }));
  } catch (error) {
    console.error("Failed to save AI mode:", error);
  }
}

// Listen for mode changes
export function subscribeToModeChanges(
  callback: (mode: AIMode) => void
): () => void {
  if (typeof window === "undefined") return () => { };

  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<AIMode>;
    callback(customEvent.detail);
  };

  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      callback(e.newValue as AIMode);
    }
  };

  window.addEventListener(MODE_CHANGE_EVENT, handler);
  window.addEventListener("storage", storageHandler);

  return () => {
    window.removeEventListener(MODE_CHANGE_EVENT, handler);
    window.removeEventListener("storage", storageHandler);
  };
}
