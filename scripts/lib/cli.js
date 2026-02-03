/**
 * Shared CLI utilities for consistent styling across scripts
 * Uses @clack/prompts for beautiful terminal output
 */
import * as p from '@clack/prompts';

// Color palette (cohesive, limited to 5 colors)
export const colors = {
    // Primary actions/success - Green
    success: (text) => `\x1b[32m${text}\x1b[0m`,
    // Warnings/notes - Yellow
    warning: (text) => `\x1b[33m${text}\x1b[0m`,
    // Errors - Red
    error: (text) => `\x1b[31m${text}\x1b[0m`,
    // Info/highlights - Cyan
    info: (text) => `\x1b[36m${text}\x1b[0m`,
    // Muted/paths - Gray
    dim: (text) => `\x1b[90m${text}\x1b[0m`,
    // Bold
    bold: (text) => `\x1b[1m${text}\x1b[0m`,
};

// Re-export clack for convenience
export { p };

/**
 * Format a file path for display (shows just basename)
 * @param {string} filePath - Full file path  
 * @param {boolean} showFull - Whether to show full path
 */
export function formatPathSync(filePath, showFull = false) {
    // Extract basename without importing path module
    const basename = filePath.split(/[\\/]/).pop() || filePath;
    if (showFull) {
        return `${colors.info(basename)} ${colors.dim(filePath)}`;
    }
    return colors.info(basename);
}

/**
 * Create a styled intro banner
 * @param {string} title - Script title
 */
export function intro(title) {
    p.intro(colors.bold(title));
}

/**
 * Create a styled outro message
 * @param {string} message - Completion message
 */
export function outro(message) {
    p.outro(colors.success(message));
}

/**
 * Log a success message with checkmark
 * @param {string} message - Success message
 */
export function success(message) {
    p.log.success(message);
}

/**
 * Log an info message
 * @param {string} message - Info message
 */
export function info(message) {
    p.log.info(message);
}

/**
 * Log a warning message
 * @param {string} message - Warning message
 */
export function warn(message) {
    p.log.warn(message);
}

/**
 * Log an error message
 * @param {string} message - Error message
 */
export function error(message) {
    p.log.error(message);
}

/**
 * Log a step/message (neutral)
 * @param {string} message - Step message
 */
export function step(message) {
    p.log.step(message);
}

/**
 * Create a spinner for async operations
 */
export function spinner() {
    return p.spinner();
}
