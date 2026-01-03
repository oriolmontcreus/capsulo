import { normalizeValue as baseNormalizeValue } from '@/lib/utils/normalization';

/**
 * Shared types for content management hooks
 * Used by both CMSManager and GlobalVariablesManager
 */

import type { ComponentData, Schema } from '@/lib/form-builder';

/**
 * Map of entity ID to form field values
 */
export type FormDataMap = Record<string, Record<string, any>>;

/**
 * Translation data structure: locale -> entityId -> fieldName -> value
 */
export type TranslationDataMap = Record<string, Record<string, Record<string, any>>>;

/**
 * Field metadata stored in component/variable data
 */
export interface FieldMeta {
  type: string;
  translatable?: boolean;
  value: any;
}

/**
 * Entity data structure (component or variable)
 */
export interface EntityDataRecord {
  [fieldName: string]: FieldMeta;
}

/**
 * Configuration for change detection
 */
export interface ChangeDetectionConfig {
  /** Current default locale */
  defaultLocale: string;
}

/**
 * Configuration for translation merging
 */
export interface TranslationMergeConfig {
  /** Available schemas to look up field definitions */
  schemas: Schema[];
  /** Default locale for fallback values */
  defaultLocale: string;
  /** Available locales for translation */
  availableLocales: string[];
}

/**
 * Configuration for draft persistence
 */
export interface DraftPersistenceConfig {
  /** Available schemas for field type lookup */
  schemas: Schema[];
  /** Default locale */
  defaultLocale: string;
  /** Save function to persist the draft */
  saveDraft: (data: any) => void;
  /** Optional callback after save */
  onRevalidate?: () => void;
}

/**
 * Helper to normalize empty-ish values for comparison.
 * Delegates to the more robust shared utility.
 */
export const normalizeValue = baseNormalizeValue;
