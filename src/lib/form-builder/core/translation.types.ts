/**
 * Core translation types and interfaces for the Capsulo CMS translation system
 */

/**
 * Locale configuration from capsulo.config.ts
 */
export interface I18nConfig {
    defaultLocale: string;
    locales: string[];
    fallbackLocale: string;
}

/**
 * Locale information with metadata
 */
export interface LocaleInfo {
    code: string;
    name: string;
    nativeName: string;
    flag?: string;
}

/**
 * Translation status for a field or set of fields
 */
export type TranslationStatus = 'complete' | 'partial' | 'missing';

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
}

/**
 * Field value structure for translatable fields
 */
export interface FieldValue {
    type: string;
    translatable?: boolean;
    value?: any; // For non-translatable fields
    values?: Record<string, any>; // For translatable fields (locale -> value)
}

/**
 * Translation metadata for tracking translation state
 */
export interface TranslationMetadata {
    /**
     * Last modified timestamp for each locale
     */
    lastModified: Record<string, string>; // ISO timestamps per locale

    /**
     * Completion status for each locale
     */
    completeness: Record<string, boolean>; // Completion status per locale
}

/**
 * Enhanced component data structure with translation support
 */
export interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, FieldValue>;
    translations?: TranslationMetadata;
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
     * Navigate to next/previous translatable field
     */
    navigateToField: (direction: 'next' | 'prev') => void;

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

    /**
     * List of all translatable field paths in the current form
     */
    translatableFields: string[];

    /**
     * Index of current field in the translatable fields array
     */
    currentFieldIndex: number;
}

/**
 * Field context information for breadcrumb display
 */
export interface FieldContext {
    /**
     * Human-readable path to the field (e.g., "Hero → Title")
     */
    displayPath: string;

    /**
     * Technical field path for data access
     */
    fieldPath: string;

    /**
     * Field type (input, textarea, select, etc.)
     */
    fieldType: string;

    /**
     * Field label or name
     */
    fieldLabel: string;
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