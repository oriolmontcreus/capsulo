/**
 * Custom error types for AI Service with user-friendly messages
 */

export class AIServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string,
    public isRetryable = false
  ) {
    super(message);
    this.name = "AIServiceError";
  }
}

export class AuthError extends AIServiceError {
  constructor(provider: string, details?: string) {
    super(
      `Authentication failed for ${provider}: ${details || "Invalid or missing credentials"}`,
      "AUTH_ERROR",
      `Please check your ${provider} API credentials.`,
      false
    );
  }
}

export class RateLimitError extends AIServiceError {
  constructor(provider: string, retryAfter?: number) {
    super(
      `Rate limit exceeded for ${provider}`,
      "RATE_LIMIT",
      `${provider} is temporarily rate limited. Retrying...`,
      true
    );
    this.retryAfter = retryAfter;
  }
  retryAfter?: number;
}

export class NetworkError extends AIServiceError {
  constructor(details?: string) {
    super(
      `Network error: ${details || "Connection failed"}`,
      "NETWORK_ERROR",
      "Connection failed. Retrying...",
      true
    );
  }
}

export class ProviderError extends AIServiceError {
  constructor(provider: string, statusCode: number, details?: string) {
    const isRetryable = statusCode >= 500 || statusCode === 429;
    super(
      `${provider} error (${statusCode}): ${details || "Unknown error"}`,
      "PROVIDER_ERROR",
      `${provider} encountered an error. ${isRetryable ? "Retrying..." : "Please try again later."}`,
      isRetryable
    );
  }
}

export class ConfigurationError extends AIServiceError {
  constructor(details: string) {
    super(
      `Configuration error: ${details}`,
      "CONFIG_ERROR",
      `${details} Please check your settings.`,
      false
    );
  }
}

/**
 * Maps any error to a typed AIServiceError
 */
export function mapErrorToTypedError(
  error: unknown,
  provider: string
): AIServiceError {
  // If already an AIServiceError, return it
  if (error instanceof AIServiceError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);

  // Configuration errors (not retryable)
  if (message.includes("NO_KEYS") || message.includes("NO_CLOUDFLARE_URL")) {
    return new ConfigurationError("AI service is not properly configured.");
  }

  // Auth errors
  if (
    message.includes("401") ||
    message.includes("Unauthorized") ||
    message.includes("Invalid API key") ||
    message.includes("Not logged in")
  ) {
    return new AuthError(provider);
  }

  // Rate limit errors
  if (
    message.includes("429") ||
    message.includes("rate limit") ||
    message.includes("RateLimitError")
  ) {
    return new RateLimitError(provider);
  }

  // Network errors
  if (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("ECONNREFUSED") ||
    message.includes("timeout") ||
    message.includes("Failed to fetch")
  ) {
    return new NetworkError();
  }

  // Provider errors (5xx)
  const fiveHundredMatch = message.match(/5\d{2}/);
  if (fiveHundredMatch) {
    return new ProviderError(
      provider,
      Number.parseInt(fiveHundredMatch[0], 10),
      message
    );
  }

  // Default to generic provider error (retryable)
  return new ProviderError(provider, 0, message);
}
