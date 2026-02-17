/**
 * Core translation types and interfaces for the Capsulo CMS translation system
 */

/**
 * Responsive value for different breakpoints
 */
export type ResponsiveValue = {
    base?: number; // Base/mobile (< 640px)
    sm?: number;   // Small screens (640px+)
    md?: number;   // Medium screens (768px+)
    lg?: number;   // Large screens (1024px+)
    xl?: number;   // Extra large screens (1280px+)
};

/**
 * Column span value type - can be a number, "full", or responsive object
 */
export type ColSpanValue = number | "full" | ResponsiveValue;

/**
 * Locale configuration from capsulo.config.ts
 */
export interface I18nConfig {
    defaultLocale: string;
    locales: string[];
    fallbackLocale: string;
}

/**
 * Translation status for a field or set of fields
 * - 'complete': All locales have translations
 * - 'missing': One or more locales are missing translations
 */
export type TranslationStatus = 'complete' | 'missing';

/**
 * Base interface for translatable fields
 * This extends existing field types to add translation support
 */
export interface TranslatableField {
    /**
     * Whether this field supports translations
     * When true, the field will store values for each locale
     */
    translatable?: boolean;

    /**
     * Column span configuration for grid layouts
     * - number: span that many columns on all breakpoints
     * - "full": span all available columns
     * - ResponsiveValue: different spans per breakpoint
     * @example
     * colSpan: 2  // span 2 columns
     * colSpan: "full"  // span all columns
     * colSpan: { base: 1, md: 2, lg: 3 }  // responsive
     */
    colSpan?: ColSpanValue;
}


/**
 * Translation context value for React context
 */
export interface TranslationContextValue {
    /**
     * Current active locale
     */
    currentLocale: string;

    /**
     * All available locales from configuration
     */
    availableLocales: string[];

    /**
     * Default locale from configuration
     */
    defaultLocale: string;

    /**
     * Whether translation mode is active
     */
    isTranslationMode: boolean;

    /**
     * Currently active field being translated
     */
    activeTranslationField: string | null;

    /**
     * Open translation sidebar for a specific field
     */
    openTranslationSidebar: (fieldPath: string) => void;

    /**
     * Close translation sidebar
     */
    closeTranslationSidebar: () => void;

    /**
     * Toggle translation mode on/off
     */
    toggleTranslationMode: () => void;

    /**
     * Set translation mode state
     */
    setTranslationMode: (enabled: boolean) => void;

    /**
     * Set the active translation field (for focus-based activation)
     */
    setActiveField: (fieldPath: string | null) => void;

    /**
     * Get translation status for a field
     */
    getTranslationStatus: (fieldPath: string) => TranslationStatus;
}

/**
 * Translation state for managing sidebar and field navigation
 */
export interface TranslationState {
    /**
     * Whether translation mode is enabled (shows globe icons and allows sidebar)
     */
    translationModeEnabled: boolean;

    /**
     * Whether the translation sidebar is open
     */
    sidebarOpen: boolean;

    /**
     * Width of the translation sidebar in pixels
     */
    sidebarWidth: number;

    /**
     * Path of the currently active field being translated
     */
    activeFieldPath: string | null;
}

/**
 * Translation validation error types
 */
export interface TranslationValidationError {
    type: 'invalid_locale' | 'missing_default_locale' | 'empty_locales' | 'duplicate_locale';
    message: string;
    locale?: string;
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
    isValid: boolean;
    errors: TranslationValidationError[];
    warnings: string[];
}