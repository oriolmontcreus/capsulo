/**
 * Retry configuration and logic for AI Service
 * Backoff timing: 5s, 10s, 20s, 40s...
 */

import { AIServiceError } from "./errors";

// Configuration keys for localStorage
export const RETRY_CONFIG_KEYS = {
  MAX_RETRIES: "ai-max-retries",
  RETRY_ENABLED: "ai-retry-enabled",
} as const;

// Default configuration
export const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  enabled: true,
};

// Retry configuration interface
export interface RetryConfig {
  maxRetries: number;
  enabled: boolean;
}

/**
 * Get retry configuration from localStorage
 */
export function getRetryConfig(): RetryConfig {
  if (typeof window === "undefined") return DEFAULT_RETRY_CONFIG;

  try {
    const storedRetries = localStorage.getItem(RETRY_CONFIG_KEYS.MAX_RETRIES);
    const storedEnabled = localStorage.getItem(RETRY_CONFIG_KEYS.RETRY_ENABLED);

    return {
      maxRetries: storedRetries
        ? Number.parseInt(storedRetries, 10)
        : DEFAULT_RETRY_CONFIG.maxRetries,
      enabled:
        storedEnabled !== null
          ? storedEnabled === "true"
          : DEFAULT_RETRY_CONFIG.enabled,
    };
  } catch {
    return DEFAULT_RETRY_CONFIG;
  }
}

/**
 * Save retry configuration to localStorage
 */
export function setRetryConfig(config: RetryConfig): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      RETRY_CONFIG_KEYS.MAX_RETRIES,
      config.maxRetries.toString()
    );
    localStorage.setItem(
      RETRY_CONFIG_KEYS.RETRY_ENABLED,
      config.enabled.toString()
    );
  } catch (error) {
    console.error("[RetryConfig] Failed to save config:", error);
  }
}

/**
 * Calculate delay for a retry attempt
 * Pattern: 5s, 10s, 20s, 40s... (5 * 2^attempt seconds)
 * Max delay: 60 seconds
 */
function calculateRetryDelay(attempt: number): number {
  // Start with 5 seconds and double each time
  const delaySeconds = 5 * 2 ** attempt;
  // Cap at 60 seconds
  const cappedDelaySeconds = Math.min(delaySeconds, 60);
  return cappedDelaySeconds * 1000; // Convert to milliseconds
}

/**
 * Retry an operation with exponential backoff
 * @param operation - The async operation to retry
 * @param isRetryable - Function to determine if an error is retryable
 * @param onRetry - Callback when a retry is scheduled (attempt number, delay in ms, error message)
 * @param customMaxRetries - Optional override for max retries
 * @param signal - Optional AbortSignal to cancel retries
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  isRetryable: (error: AIServiceError) => boolean,
  onRetry?: (attempt: number, delayMs: number, errorMessage: string) => void,
  customMaxRetries?: number,
  signal?: AbortSignal
): Promise<T> {
  const config = getRetryConfig();

  // If retries are disabled, just run once
  if (!config.enabled) {
    return operation();
  }

  const maxRetries = customMaxRetries ?? config.maxRetries;
  let lastError: AIServiceError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const typedError =
        error instanceof AIServiceError
          ? error
          : new AIServiceError(String(error), "UNKNOWN", String(error), true);

      lastError = typedError;

      // Don't retry on last attempt or if error is not retryable
      if (attempt >= maxRetries || !isRetryable(typedError)) {
        throw typedError;
      }

      // Check if aborted before scheduling retry
      if (signal?.aborted) {
        throw new Error("Request cancelled");
      }

      // Calculate delay: 5s, 10s, 20s, 40s...
      const delayMs = calculateRetryDelay(attempt);

      if (onRetry) {
        onRetry(attempt + 1, delayMs, typedError.userMessage);
      }

      // Wait before retrying, but check for abort during wait
      await new Promise((resolve, reject) => {
        let abortHandler: (() => void) | undefined;
        let timeout: NodeJS.Timeout | undefined;

        const cleanup = () => {
          if (timeout) clearTimeout(timeout);
          if (abortHandler && signal) {
            signal.removeEventListener("abort", abortHandler);
          }
        };

        timeout = setTimeout(() => {
          cleanup();
          resolve(null);
        }, delayMs);

        if (signal) {
          abortHandler = () => {
            cleanup();
            reject(new Error("Request cancelled"));
          };

          signal.addEventListener("abort", abortHandler, { once: true });
        }
      });

      // Check if aborted after wait
      if (signal?.aborted) {
        throw new Error("Request cancelled");
      }
    }
  }

  throw lastError!;
}
