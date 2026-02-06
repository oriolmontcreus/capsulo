/**
 * AI Model identifiers
 */
export const MODELS = {
    CHAT: "@cf/meta/llama-4-scout-17b-16e-instruct",
    TITLE_GENERATION: "@hf/nousresearch/hermes-2-pro-mistral-7b",
    INTENT_CLASSIFICATION: "@cf/meta/llama-3.1-8b-instruct",
    CMS_ACTIONS: "@hf/nousresearch/hermes-2-pro-mistral-7b",
} as const;

/**
 * Default configurations
 */
export const CONFIG = {
    DEFAULT_MAX_TOKENS: 4096,
    DEFAULT_TEMPERATURE: 0.2,
    TITLE_MAX_TOKENS: 256,
    INTENT_MAX_TOKENS: 10,
    ACTIONS_MAX_TOKENS: 1024,
} as const;
