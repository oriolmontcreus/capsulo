/**
 * Context Monitoring Utilities
 * Track token usage and provide warnings for context window limits
 */

import type { AIMode } from "./modelConfig";
import { getContextLimit, WARNING_THRESHOLD } from "./modelConfig";

export interface ContextStatus {
  usedTokens: number;
  maxTokens: number;
  percentage: number;
  isWarning: boolean; // Over 80%
  isExceeded: boolean; // Over 100%
  remainingTokens: number;
}

export interface Message {
  role: string;
  content: string;
}

// Rough token estimation (1 token ≈ 4 characters or 1.3 words)
// This is conservative to avoid exceeding limits
export function estimateTokens(text: string): number {
  if (!text) return 0;

  // Method 1: Character-based (1 token ≈ 4 chars for English)
  const charEstimate = Math.ceil(text.length / 4);

  // Method 2: Word-based (1 token ≈ 1.3 words on average)
  const words = text.trim().split(/\s+/).length;
  const wordEstimate = Math.ceil(words * 1.3);

  // Use the higher estimate to be safe
  return Math.max(charEstimate, wordEstimate);
}

// Calculate tokens for system prompt
function estimateSystemPromptTokens(context?: any): number {
  // Base system prompt overhead
  let tokens = 200;

  // Add context size if provided
  if (context) {
    const contextStr = JSON.stringify(context);
    tokens += estimateTokens(contextStr);
  }

  return tokens;
}

// Calculate total conversation tokens
export function calculateConversationTokens(
  messages: Message[],
  context?: any
): number {
  let total = 0;

  // System prompt tokens
  total += estimateSystemPromptTokens(context);

  // Message tokens (content + role overhead)
  for (const message of messages) {
    // Content tokens
    total += estimateTokens(message.content);
    // Role marker overhead (~4 tokens per message)
    total += 4;
  }

  return total;
}

// Get context status for current conversation
export function getContextStatus(
  messages: Message[],
  mode: AIMode,
  context?: any
): ContextStatus {
  const usedTokens = calculateConversationTokens(messages, context);
  const maxTokens = getContextLimit(mode);
  const percentage = usedTokens / maxTokens;
  const remainingTokens = maxTokens - usedTokens;

  return {
    usedTokens,
    maxTokens,
    percentage,
    isWarning: percentage >= WARNING_THRESHOLD,
    isExceeded: percentage >= 1,
    remainingTokens,
  };
}

// Format token count for display (e.g., "24.5K")
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

// Get color based on percentage
export function getContextColor(percentage: number): string {
  if (percentage >= 1) return "text-red-500";
  if (percentage >= WARNING_THRESHOLD) return "text-yellow-500";
  return "text-green-500";
}

// Get stroke color for circular progress
export function getContextStrokeColor(percentage: number): string {
  if (percentage >= 1) return "stroke-red-500";
  if (percentage >= WARNING_THRESHOLD) return "stroke-yellow-500";
  return "stroke-green-500";
}
