/**
 * Content Manager Hooks
 * Shared hooks for CMSManager and GlobalVariablesManager
 */

export * from './types';
export { useFormChangeDetection, useTranslationChangeDetection } from './useFormChangeDetection';
export { useTranslationMerge } from './useTranslationMerge';
export { useDraftPersistence } from './useDraftPersistence';
export { useSaveStatusReporting } from './useSaveStatusReporting';
