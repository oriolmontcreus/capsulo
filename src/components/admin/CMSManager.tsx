import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getAllSchemas } from '@/lib/form-builder';
import type { ComponentData, PageData, Schema } from '@/lib/form-builder';
import { flattenFields } from '@/lib/form-builder/core/fieldHelpers';
import {
  savePage,
  hasUnpublishedChanges,
  loadDraft,
  isDevelopmentMode
} from '@/lib/cms-storage-adapter';
import { savePageDraft, getPageDraft } from '@/lib/cms-local-changes';
import { cn } from '@/lib/utils';
import isEqual from 'lodash/isEqual';
import { InlineComponentForm } from './InlineComponentForm';
import { PublishButton } from './PublishButton';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { fieldToZod } from '@/lib/form-builder/fields/ZodRegistry';
import { useFileUploadSaveIntegration } from '@/lib/form-builder/fields/FileUpload/useFileUploadIntegration';
import { useTranslationData } from '@/lib/form-builder/context/TranslationDataContext';
import { useTranslation } from '@/lib/form-builder/context/TranslationContext';
import { useRepeaterEdit } from '@/lib/form-builder/context/RepeaterEditContext';
import { useValidationOptional, type ValidationError } from '@/lib/form-builder/context/ValidationContext';
import { RepeaterItemEditView } from '@/lib/form-builder/fields/Repeater/variants/RepeaterItemEditView';
import { useDebouncedValueWithStatus } from '@/lib/hooks/useDebouncedCallback';
import { AlertTriangle } from 'lucide-react';
import config from '../../../capsulo.config';
import '@/lib/form-builder/schemas';

interface PageInfo {
  id: string;
  name: string;
  path: string;
}

interface CMSManagerProps {
  initialData?: Record<string, PageData>;
  availablePages?: PageInfo[];
  componentManifest?: Record<string, Array<{ schemaKey: string; componentName: string; occurrenceCount: number }>>;
  githubOwner?: string;
  githubRepo?: string;
  selectedPage?: string;
  onPageChange?: (pageId: string) => void;
  onPageDataUpdate?: (pageId: string, newPageData: PageData) => void;
  onSaveRef?: React.RefObject<{ save: () => Promise<void> }>;
  onReorderRef?: React.RefObject<{ reorder: (pageId: string, newComponentIds: string[]) => void }>;
  onHasChanges?: (hasChanges: boolean) => void;
  onSaveStatusChange?: (isDebouncing: boolean) => void;
}

const generateItemId = (): string => {
  // Prefer crypto.randomUUID() if available (modern browsers and Node.js 16.7.0+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `item_${crypto.randomUUID()}`;
  }

  // Fallback: use Date.now() + cryptographically strong random component
  const timestamp = Date.now();

  // Check if crypto and getRandomValues are available
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);

    // Convert bytes to hex string
    const hexString = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return `item_${timestamp}_${hexString}`;
  }

  let hexString = '';
  for (let i = 0; i < 16; i++) {
    const randomByte = Math.floor(Math.random() * 256);
    hexString += randomByte.toString(16).padStart(2, '0');
  }

  return `item_${timestamp}_${hexString}`;
};

const CMSManagerComponent: React.FC<CMSManagerProps> = ({
  initialData = {},
  availablePages = [],
  componentManifest,
  githubOwner,
  githubRepo,
  selectedPage: propSelectedPage,
  onPageChange,
  onPageDataUpdate,
  onSaveRef,
  onReorderRef,
  onHasChanges,
  onSaveStatusChange
}) => {
  const [selectedPage, setSelectedPage] = useState(propSelectedPage || availablePages[0]?.id || 'home');
  const [pageData, setPageData] = useState<PageData>({ components: [] });
  const [availableSchemas] = useState<Schema[]>(getAllSchemas());
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const timeoutIdsRef = useRef<NodeJS.Timeout[]>([]);
  const loadStartTimeRef = useRef<number>(0);
  const [componentFormData, setComponentFormData] = useState<Record<string, Record<string, any>>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, Record<string, string>>>({});

  // Debounced componentFormData for change detection - reduces frequency of hasFormChanges memo recalculation
  // The raw componentFormData is still used for immediate UI updates, but change detection is debounced
  const [debouncedComponentFormData, isDebouncing] = useDebouncedValueWithStatus(componentFormData, config.ui.autoSaveDebounceMs);

  // Validation context (optional - may not be wrapped in ValidationProvider)
  const validationContext = useValidationOptional();
  const [saveTimestamp, setSaveTimestamp] = useState<number>(Date.now()); // Force re-render after save

  // File upload integration
  const { processFormDataForSave, hasPendingFileOperations, queueRichEditorImageDeletions } = useFileUploadSaveIntegration();

  // Get translation data to track translation changes
  const { translationData, clearTranslationData, setTranslationValue } = useTranslationData();
  const { defaultLocale, availableLocales, isTranslationMode } = useTranslation();
  const { editState, closeEdit } = useRepeaterEdit();

  // Debounced translationData for draft persistence - ensures translation changes trigger autosave
  const [debouncedTranslationData, isTranslationDebouncing] = useDebouncedValueWithStatus(translationData, config.ui.autoSaveDebounceMs);

  // Helper function to update page data
  const updatePageData = useCallback((newPageData: PageData) => {
    setPageData(newPageData);
    // Don't call onPageDataUpdate here - let the effect handle it
    // This prevents duplicate updates and ensures filtered data is used
  }, []);

  // Use ref to track and notify parent when page data changes
  const prevPageDataRef = useRef<PageData>({ components: [] });
  const onPageDataUpdateRef = useRef(onPageDataUpdate);
  const isInitialLoadRef = useRef(true);
  onPageDataUpdateRef.current = onPageDataUpdate;

  useEffect(() => {
    // Reset prevPageDataRef on initial load to prevent stale data from previous page
    if (isInitialLoadRef.current) {
      prevPageDataRef.current = { components: [] };
    }

    // Only update if the data actually changed
    const prevData = prevPageDataRef.current;
    const currentData = pageData;

    // Compare component IDs and aliases to detect additions, deletions, reordering, or renames
    const prevIds = prevData.components.map(c => `${c.id}:${c.alias || ''}`).join(',');
    const currentIds = currentData.components.map(c => `${c.id}:${c.alias || ''}`).join(',');

    if (prevIds !== currentIds) {
      // Skip notifying parent on initial load (when prevIds is empty)
      if (!isInitialLoadRef.current || prevIds !== '') {
        onPageDataUpdateRef.current?.(selectedPage, currentData);
      }
      // Only update prevPageDataRef after the gate check
      prevPageDataRef.current = currentData;
    }
  }, [pageData, selectedPage]);

  // Simple translation change detection
  const hasTranslationChanges = useMemo(() => {
    return Object.entries(translationData).some(([locale, localeData]) => {
      if (locale === defaultLocale) return false;
      // Any translation data (including empty values) should be considered a change
      return Object.keys(localeData).length > 0;
    });
  }, [translationData, defaultLocale]);

  // Optimized form change detection - uses debounced data to reduce recalculation frequency
  const hasFormChanges = useMemo(() => {
    const changedComponents: Record<string, any> = {};

    // Helper to normalize empty-ish values
    const normalizeValue = (val: any): any => {
      if (val === '' || val === null || val === undefined) return undefined;
      return val;
    };

    const hasChanges = Object.keys(debouncedComponentFormData).some(componentId => {
      const formData = debouncedComponentFormData[componentId];
      const component = pageData.components.find(c => c.id === componentId);

      if (!component || !formData) return false;

      const changedFields: Record<string, any> = {};
      const hasComponentChanges = Object.entries(formData).some(([key, value]) => {
        const fieldMeta = component.data[key];
        const componentFieldValue = fieldMeta?.value;

        // Normalize values: treat empty string, null, and undefined as equivalent
        const normalizedFormValue = normalizeValue(value);
        const normalizedComponentValue = normalizeValue(componentFieldValue);

        // Check if this is a translatable field with translation object
        const isTranslatableObject =
          fieldMeta?.translatable &&
          normalizedComponentValue &&
          typeof normalizedComponentValue === 'object' &&
          !Array.isArray(normalizedComponentValue);

        let isDifferent = false;
        // Handle translation format where value is an object with locale keys
        if (isTranslatableObject) {
          // Compare with default locale value from translation object
          const localeValue = normalizedComponentValue[defaultLocale];
          const normalizedLocaleValue = normalizeValue(localeValue);
          isDifferent = normalizedLocaleValue !== normalizedFormValue;
        } else {
          // Handle simple value or non-translatable structured objects
          // For structured objects (like fileUpload), use deep comparison
          if (normalizedComponentValue && typeof normalizedComponentValue === 'object' &&
            normalizedFormValue && typeof normalizedFormValue === 'object') {
            isDifferent = !isEqual(normalizedComponentValue, normalizedFormValue);
          } else {
            isDifferent = normalizedComponentValue !== normalizedFormValue;
          }
        }

        if (isDifferent) {
          changedFields[key] = {
            formValue: value,
            componentValue: componentFieldValue
          };
        }

        return isDifferent;
      });

      if (hasComponentChanges) {
        changedComponents[componentId] = changedFields;
      }

      return hasComponentChanges;
    });

    // Consider the computed changedComponents in the change detection
    return hasChanges && Object.keys(changedComponents).length > 0;
  }, [debouncedComponentFormData, pageData.components, defaultLocale]);

  // Final change detection - only runs when any of the boolean states change
  useEffect(() => {
    // Skip change detection during initial load
    if (isInitialLoadRef.current && !hasFormChanges && !hasTranslationChanges) {
      return;
    }

    const totalChanges = hasFormChanges || hasTranslationChanges;
    setHasChanges(totalChanges);
  }, [hasFormChanges, hasTranslationChanges]);

  // Notify parent about changes
  useEffect(() => {
    onHasChanges?.(hasChanges);
  }, [hasChanges, onHasChanges]);

  // Notify parent about save status (debouncing state)
  // We block reporting for the first few seconds to avoid "Saving..." showing during initial load/hydration
  const [saveStatusBlocked, setSaveStatusBlocked] = useState(true);

  useEffect(() => {
    // Unblock save status reporting after configured duration (default: 2.5s)
    const timer = setTimeout(() => {
      setSaveStatusBlocked(false);
    }, config.ui.autoSaveBlockDurationMs ?? 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (saveStatusBlocked) {
      // During initial load period, always report false (not saving)
      onSaveStatusChange?.(false);
    } else {
      // After Block period, report actual status (include translation debouncing)
      onSaveStatusChange?.(isDebouncing || isTranslationDebouncing);
    }
  }, [isDebouncing, isTranslationDebouncing, saveStatusBlocked, onSaveStatusChange]);

  // Save changes to localStorage for persistence across page navigation
  // This allows the Changes viewer to access uncommitted edits
  useEffect(() => {
    if (!hasChanges || isInitialLoadRef.current) return;

    // Build page data with form edits and translations merged in
    const mergedComponents = pageData.components.map(component => {
      const formData = debouncedComponentFormData[component.id];

      const schema = availableSchemas.find(s => s.name === component.schemaName);
      if (!schema) return component;

      // Merge form data into component data
      const mergedData: Record<string, { type: any; translatable?: boolean; value: any }> = { ...component.data };

      // First, merge form data (default locale values)
      if (formData) {
        Object.entries(formData).forEach(([fieldName, value]) => {
          const existingField = component.data[fieldName];
          if (existingField) {
            // Handle translatable fields
            if (existingField.translatable && typeof existingField.value === 'object' && !Array.isArray(existingField.value)) {
              mergedData[fieldName] = {
                ...existingField,
                value: { ...existingField.value, [defaultLocale]: value }
              };
            } else {
              mergedData[fieldName] = { ...existingField, value };
            }
          } else {
            // New field
            mergedData[fieldName] = { type: 'unknown', value };
          }
        });
      }

      // Second, merge translation data (non-default locale values)
      // This ensures changes from the RightSidebar translation panel are persisted
      Object.entries(debouncedTranslationData).forEach(([locale, localeData]) => {
        if (locale === defaultLocale) return; // Skip default locale, already handled above

        Object.entries(localeData).forEach(([fieldName, value]) => {
          const existingField = mergedData[fieldName] || component.data[fieldName];
          if (existingField) {
            // Ensure the value is a translation object
            const currentValue = mergedData[fieldName]?.value ?? existingField.value;
            const isTranslationObject = currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue);

            if (isTranslationObject) {
              mergedData[fieldName] = {
                ...existingField,
                translatable: true,
                value: { ...currentValue, [locale]: value }
              };
            } else {
              // Convert to translation object format
              mergedData[fieldName] = {
                ...existingField,
                translatable: true,
                value: {
                  [defaultLocale]: currentValue,
                  [locale]: value
                }
              };
            }
          }
        });
      });

      return { ...component, data: mergedData };
    });

    const draftData: PageData = { components: mergedComponents };
    savePageDraft(selectedPage, draftData);
  }, [hasChanges, pageData.components, debouncedComponentFormData, debouncedTranslationData, selectedPage, availableSchemas, defaultLocale]);

  // Function to load translation data from existing component data
  const loadTranslationDataFromComponents = useCallback((components: ComponentData[]) => {
    components.forEach(component => {
      Object.entries(component.data).forEach(([fieldName, fieldData]) => {
        // Check if the field value is an object with locale keys
        if (fieldData.value && typeof fieldData.value === 'object' && !Array.isArray(fieldData.value)) {
          Object.entries(fieldData.value).forEach(([locale, value]) => {
            // Only load non-default locales (default locale is handled by form data)
            if (availableLocales.includes(locale) && locale !== defaultLocale && value !== undefined && value !== '') {
              setTranslationValue(fieldName, locale, value);
            }
          });
        }
      });
    });
  }, [setTranslationValue, defaultLocale, availableLocales]);



  // Handle external page selection (from sidebar)
  useEffect(() => {
    if (propSelectedPage && propSelectedPage !== selectedPage) {
      setSelectedPage(propSelectedPage);
    }
  }, [propSelectedPage]);

  // Notify parent when page changes
  useEffect(() => {
    onPageChange?.(selectedPage);
  }, [selectedPage, onPageChange]);

  const handleSaveAllComponents = useCallback(async () => {
    // First, validate all components
    const errors: Record<string, Record<string, string>> = {};
    const errorDetailsList: ValidationError[] = [];
    let hasAnyErrors = false;

    pageData.components
      .forEach(component => {
        const schema = availableSchemas.find(s => s.name === component.schemaName);
        if (!schema) return;

        const formData = componentFormData[component.id] || {};
        const componentErrors: Record<string, string> = {};

        // Only validate data fields, not layouts
        const dataFields = flattenFields(schema.fields);

        dataFields.forEach(field => {
          const zodSchema = fieldToZod(field, formData);
          let value = formData[field.name];

          // If no form data, get from component data
          if (value === undefined) {
            const componentFieldValue = component.data[field.name]?.value;

            // Handle new translation format where value can be an object with locale keys
            if (componentFieldValue && typeof componentFieldValue === 'object' && !Array.isArray(componentFieldValue)) {
              // Use default locale value from translation object
              value = componentFieldValue[defaultLocale];
            } else {
              // Handle simple value (backward compatibility)
              value = componentFieldValue;
            }
          }

          const result = zodSchema.safeParse(value);

          if (!result.success) {
            // Iterating over all errors to handle nested fields (like in Repeaters)
            result.error.errors.forEach(issue => {
              // Construct path: fieldName + dot + issue path
              // e.g. "cards" + "." + "0" + "." + "email" -> "cards.0.email"
              const pathParts = [field.name, ...issue.path];
              const path = pathParts.join('.');
              componentErrors[path] = issue.message;

              // Build detailed error info for the sidebar
              const fieldLabel = 'label' in field && field.label ? String(field.label) : field.name;
              errorDetailsList.push({
                componentId: component.id,
                componentName: component.alias || component.schemaName,
                fieldPath: path,
                fieldLabel: fieldLabel,
                tabName: undefined, // Could be enhanced to find tab name
                tabIndex: undefined,
                message: issue.message,
              });
            });
            hasAnyErrors = true;
          }
        });

        if (Object.keys(componentErrors).length > 0) {
          errors[component.id] = componentErrors;
        }
      });

    // If there are errors, show them and don't save
    if (hasAnyErrors) {
      setValidationErrors(errors);
      // Push to validation context if available (for error sidebar)
      if (validationContext) {
        validationContext.setValidationErrors(errors, errorDetailsList);
      }
      throw new Error('Validation failed. Please fix the errors before saving.');
    }

    // Clear any previous errors
    setValidationErrors({});
    if (validationContext) {
      validationContext.clearValidationErrors();
    }

    // Helper to clean empty values (convert empty strings to undefined)
    const cleanValue = (value: any): any => {
      if (value === '' || value === null) {
        return undefined;
      }
      // For arrays, remove empty strings
      if (Array.isArray(value)) {
        return value.filter(v => v !== '' && v !== null);
      }
      return value;
    };

    setSaving(true);
    try {
      // Queue deletions for images removed from rich editor fields
      queueRichEditorImageDeletions(pageData.components, componentFormData);

      // Process any pending file operations (uploads and deletions)
      let processedFormData = componentFormData;

      if (hasPendingFileOperations()) {
        // Build nested structure for file processing, preserving component context
        const nestedFormData: Record<string, Record<string, any>> = {};

        // Add current form data with component context
        Object.entries(componentFormData).forEach(([componentId, formData]) => {
          nestedFormData[componentId] = { ...formData };
        });

        // Also include existing FileUpload field values from component data
        pageData.components.forEach(component => {
          const schema = availableSchemas.find(s => s.name === component.schemaName);
          if (!schema) return;

          // Ensure component entry exists
          if (!nestedFormData[component.id]) {
            nestedFormData[component.id] = {};
          }

          const dataFields = flattenFields(schema.fields);
          dataFields.forEach(field => {
            if (field.type === 'fileUpload') {
              const existingValue = component.data[field.name]?.value;
              // Only add if not already in form data
              if (!(field.name in nestedFormData[component.id]) && existingValue) {
                nestedFormData[component.id][field.name] = existingValue;
              }
            }
          });
        });

        // Process file operations and get updated form data (now preserves component context)
        processedFormData = await processFormDataForSave(nestedFormData);
      }

      // Build updated page data from processed form data
      const updatedComponents = pageData.components
        .map(component => {
          const schema = availableSchemas.find(s => s.name === component.schemaName);
          if (!schema) return component;

          const formData = processedFormData[component.id] || {};
          const componentDataUpdated: Record<string, { type: any; translatable?: boolean; value: any }> = {};

          // Only save data fields, not layouts (layouts are just for CMS UI organization)
          const dataFields = flattenFields(schema.fields);

          dataFields.forEach(field => {
            const rawValue = formData[field.name] ?? component.data[field.name]?.value;

            // Special handling for FileUpload fields
            if (field.type === 'fileUpload') {
              // Ensure FileUpload fields always have the correct structure
              let fileUploadValue = rawValue;

              // If it's not already in the correct format, initialize it
              if (!fileUploadValue || typeof fileUploadValue !== 'object' || !Array.isArray(fileUploadValue.files)) {
                fileUploadValue = { files: [] };
              }

              // Clean up temporary flags that shouldn't be saved
              const cleanFileUploadValue = {
                files: fileUploadValue.files
              };

              componentDataUpdated[field.name] = {
                type: field.type,
                translatable: (field as any).translatable || false,
                value: cleanFileUploadValue,
              };
            } else if (field.type === 'repeater') {
              // Special handling for Repeater fields to prevent double-nesting and ensure _ids
              const existingValue = component.data[field.name]?.value;
              const isTranslatable = (field as any).translatable ||
                (existingValue && typeof existingValue === 'object' && !Array.isArray(existingValue) && defaultLocale in existingValue);

              if (!isTranslatable) {
                // Simple array case
                let items = Array.isArray(rawValue) ? rawValue : [];
                // Ensure _ids
                items = items.map((item: any) => {
                  if (item && typeof item === 'object' && !item._id) {
                    return { ...item, _id: generateItemId() };
                  }
                  return item;
                });

                componentDataUpdated[field.name] = {
                  type: field.type,
                  translatable: false,
                  value: items
                };
              } else {
                // Translatable case (per-locale arrays)
                let repeaterValue: Record<string, any> = {};

                // Initialize with existing value if it's a translation object
                if (existingValue && typeof existingValue === 'object' && !Array.isArray(existingValue)) {
                  repeaterValue = { ...existingValue };
                }

                // Determine what rawValue represents
                if (Array.isArray(rawValue)) {
                  // It's the array for the default locale (from form data)
                  // Use cleanValue to handle empty/null, but default to [] for repeater
                  const cleaned = cleanValue(rawValue);
                  repeaterValue[defaultLocale] = Array.isArray(cleaned) ? cleaned : [];
                } else if (rawValue && typeof rawValue === 'object') {
                  // It's likely the full translation object (fallback from component data)
                  // Merge it in to ensure we have all locales
                  repeaterValue = { ...repeaterValue, ...rawValue };
                }

                // Update translations from translationData (other locales)
                Object.entries(translationData).forEach(([locale, localeData]) => {
                  if (locale !== defaultLocale && localeData[field.name] !== undefined) {
                    const newTranslationValue = localeData[field.name];

                    // If both are arrays, merge them to preserve existing translations for other items
                    // This handles the case where translationData only contains the item currently being edited (sparse array)
                    if (Array.isArray(newTranslationValue) && Array.isArray(repeaterValue[locale])) {
                      const merged = [...repeaterValue[locale]];

                      // Ensure merged array is at least as long as the new one
                      if (newTranslationValue.length > merged.length) {
                        merged.length = newTranslationValue.length;
                      }

                      newTranslationValue.forEach((item: any, index: number) => {
                        // forEach skips empty slots in sparse arrays, so we only update changed items
                        // We also check for null because JSON serialization (used in deepClone fallback) converts holes to null
                        if (item !== undefined && item !== null) {
                          // If both are objects, merge properties (to handle partial updates of an item fields)
                          if (merged[index] && typeof merged[index] === 'object' && typeof item === 'object') {
                            merged[index] = { ...merged[index], ...item };
                          } else {
                            merged[index] = item;
                          }
                        }
                      });
                      repeaterValue[locale] = merged;
                    } else {
                      // Otherwise just set/overwrite (first translation or not an array)
                      repeaterValue[locale] = newTranslationValue;
                    }
                  }
                });

                // Ensure _id exists for all items in all locales
                Object.keys(repeaterValue).forEach(locale => {
                  if (Array.isArray(repeaterValue[locale])) {
                    repeaterValue[locale] = repeaterValue[locale].map((item: any) => {
                      if (item && typeof item === 'object' && !item._id) {
                        return { ...item, _id: generateItemId() };
                      }
                      return item;
                    });
                  }
                });

                componentDataUpdated[field.name] = {
                  type: field.type,
                  translatable: true,
                  value: repeaterValue
                };
              }
            } else {
              // Handle translations for other field types
              // Check if we have translations for this field
              const fieldTranslations: Record<string, any> = {};
              let hasTranslations = false;

              // First, preserve existing translations from component data (but they can be overridden later)
              const existingFieldValue = component.data[field.name]?.value;
              // Check if the existing value is actually a translation map (all keys are locale codes)
              // This prevents treating structured objects like SerializedEditorState (with 'root' key)
              // or link objects (with 'url', 'label' keys) as translation maps
              const isTranslationMap = existingFieldValue &&
                typeof existingFieldValue === 'object' &&
                !Array.isArray(existingFieldValue) &&
                Object.keys(existingFieldValue).length > 0 &&
                Object.keys(existingFieldValue).every(key => availableLocales.includes(key));

              if (isTranslationMap) {
                // Copy all existing translations (including empty ones)
                Object.entries(existingFieldValue).forEach(([locale, value]) => {
                  fieldTranslations[locale] = value;
                  hasTranslations = true;
                });
              }

              // Add/update default locale value from form data
              const cleanedValue = cleanValue(rawValue);
              if (cleanedValue !== undefined) {
                fieldTranslations[defaultLocale] = cleanedValue;
                hasTranslations = true;
              }

              // Add/update translations from current translation context (this will override existing ones)
              Object.entries(translationData).forEach(([locale, localeData]) => {
                if (locale !== defaultLocale && localeData[field.name] !== undefined) {
                  let translationValue = localeData[field.name];

                  // For translations, preserve empty strings as empty strings (don't convert to undefined)
                  // This allows users to explicitly clear translations
                  if (translationValue === null) {
                    translationValue = '';
                  }

                  fieldTranslations[locale] = translationValue;
                  hasTranslations = true;
                }
              });

              // If we have translations, store as object; otherwise store as simple value
              // For translatable fields, ALWAYS wrap in locale keys so initializeFieldRecursive can extract correctly
              const isFieldTranslatable = (field as any).translatable || false;

              if (hasTranslations && Object.keys(fieldTranslations).length > 1) {
                // Multiple locales - store as object
                componentDataUpdated[field.name] = {
                  type: field.type,
                  translatable: isFieldTranslatable,
                  value: fieldTranslations,
                  ...(field.type === 'select' && (field as any).internalLinks && (field as any).autoResolveLocale ? { _internalLink: true } : {})
                };
              } else if (hasTranslations && isFieldTranslatable) {
                // Translatable field with only default locale - still wrap in locale keys
                // This ensures initializeFieldRecursive can extract the value correctly using fieldValue[defaultLocale]
                componentDataUpdated[field.name] = {
                  type: field.type,
                  translatable: true,
                  value: fieldTranslations, // Keep as { [defaultLocale]: value }
                  ...(field.type === 'select' && (field as any).internalLinks && (field as any).autoResolveLocale ? { _internalLink: true } : {})
                };
              } else if (hasTranslations) {
                // Non-translatable field with only default locale - store as simple value
                componentDataUpdated[field.name] = {
                  type: field.type,
                  translatable: false,
                  value: fieldTranslations[defaultLocale],
                  ...(field.type === 'select' && (field as any).internalLinks && (field as any).autoResolveLocale ? { _internalLink: true } : {})
                };
              } else {
                // No value at all
                componentDataUpdated[field.name] = {
                  type: field.type,
                  translatable: isFieldTranslatable,
                  value: undefined,
                  ...(field.type === 'select' && (field as any).internalLinks && (field as any).autoResolveLocale ? { _internalLink: true } : {})
                };
              }
            }
          });

          return {
            ...component,
            data: componentDataUpdated
          };
        });

      const updated: PageData = { components: updatedComponents };

      await savePage(selectedPage, updated);
      updatePageData(updated);
      setHasChanges(false); // Set to false since we just saved

      // Update form data with the saved values instead of clearing it completely
      // This ensures FileUpload fields show the uploaded files immediately
      const updatedFormData: Record<string, Record<string, any>> = {};
      updated.components.forEach(component => {
        const schema = availableSchemas.find(s => s.name === component.schemaName);
        if (!schema) return;

        const dataFields = flattenFields(schema.fields);
        const componentFormData: Record<string, any> = {};

        dataFields.forEach(field => {
          const fieldData = component.data[field.name];
          const fieldValue = fieldData?.value;
          const isTranslatable = fieldData?.translatable === true;

          // For translatable fields, extract the default locale value from the locale-keyed object
          // This mirrors what initializeFieldRecursive does
          if (isTranslatable && fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue) && defaultLocale in fieldValue) {
            componentFormData[field.name] = fieldValue[defaultLocale];
          } else {
            componentFormData[field.name] = fieldValue;
          }
        });

        updatedFormData[component.id] = componentFormData;
      });

      setComponentFormData(updatedFormData);
      setValidationErrors({}); // Clear validation errors after successful save
      clearTranslationData(); // Clear translation data after save
      setSaveTimestamp(Date.now()); // Force component re-render to update translation icons
    } catch (error: any) {
      console.error('[CMSManager] Save failed:', error);
      alert(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }, [pageData.components, availableSchemas, componentFormData, selectedPage, updatePageData, translationData, defaultLocale, availableLocales, clearTranslationData, queueRichEditorImageDeletions]);

  // Expose save function to parent
  useEffect(() => {
    if (onSaveRef && onSaveRef.current) {
      onSaveRef.current.save = handleSaveAllComponents;
    }
  }, [onSaveRef, handleSaveAllComponents]);

  // Expose reorder function to parent
  useEffect(() => {
    if (onReorderRef && onReorderRef.current) {
      onReorderRef.current.reorder = (pageId: string, newComponentIds: string[]) => {
        // Only reorder if it's the current page
        if (pageId !== selectedPage) return;

        setPageData(prevData => {
          // Create a map of components by ID for quick lookup
          const componentMap = new Map(
            prevData.components.map(comp => [comp.id, comp])
          );

          // Reorder components according to newComponentIds
          const reorderedComponents = newComponentIds
            .map(id => componentMap.get(id))
            .filter((comp): comp is ComponentData => comp !== undefined);

          return {
            ...prevData,
            components: reorderedComponents
          };
        });

        // Mark as having changes
        setHasChanges(true);
      };
    }
  }, [onReorderRef, selectedPage]);

  useEffect(() => {
    // Allow reloading when initialData changes by using an active flag instead of a blocking ref
    let isActive = true;

    setLoading(true);
    setShowContent(false);
    setContentVisible(false);
    loadStartTimeRef.current = Date.now();
    isInitialLoadRef.current = true; // Reset initial load flag when switching pages

    // Close any open repeater edit view when switching pages
    closeEdit();

    const loadPage = async () => {
      clearTranslationData();

      try {
        // PRIORITY 1: Check localStorage for local drafts first
        // This ensures we never lose user's uncommitted changes when navigating
        const localDraft = getPageDraft(selectedPage);
        if (localDraft) {
          console.log('[CMSManager] Loading from localStorage draft for page:', selectedPage);

          // Sync localStorage draft with manifest
          const manifestComponents = componentManifest?.[selectedPage] || [];
          const draftSyncedComponents = [...localDraft.components];
          const draftExistingIds = new Set(localDraft.components.map(c => c.id));

          manifestComponents.forEach(({ schemaKey, occurrenceCount }) => {
            const schema = availableSchemas.find(s => s.key === schemaKey);
            if (!schema) return;

            for (let i = 0; i < occurrenceCount; i++) {
              const deterministicId = `${schemaKey}-${i}`;
              if (!draftExistingIds.has(deterministicId)) {
                draftSyncedComponents.push({
                  id: deterministicId,
                  schemaName: schema.name,
                  data: {}
                });
              }
            }
          });

          if (!isActive) return;
          updatePageData({ components: draftSyncedComponents });
          loadTranslationDataFromComponents(draftSyncedComponents);
          setHasChanges(true); // Local drafts mean we have uncommitted changes
          return;
        }

        // PRIORITY 2: Use cached/initial data from props
        const cachedPageData = initialData[selectedPage];

        if (cachedPageData) {
          const collectionData = cachedPageData;

          // Sync with manifest: auto-create missing components
          const manifestComponents = componentManifest?.[selectedPage] || [];
          const existingComponentIds = new Set(collectionData.components.map(c => c.id));

          const syncedComponents = [...collectionData.components];

          // For each component in the manifest, ensure it exists in the data
          manifestComponents.forEach(({ schemaKey, componentName, occurrenceCount }) => {
            const schema = availableSchemas.find(s => s.key === schemaKey);
            if (!schema) return;

            // Check for components with deterministic IDs (schemaKey-0, schemaKey-1, etc.)
            for (let i = 0; i < occurrenceCount; i++) {
              const deterministicId = `${schemaKey}-${i}`;

              if (!existingComponentIds.has(deterministicId)) {
                // Auto-create missing component entry
                const newComponent: ComponentData = {
                  id: deterministicId,
                  schemaName: schema.name,
                  data: {}
                };
                syncedComponents.push(newComponent);
                existingComponentIds.add(deterministicId);
              }
            }
          });

          const syncedData = { components: syncedComponents };

          const hasUnpublished = await hasUnpublishedChanges();

          // Check active status after async await
          if (!isActive) return;

          if (hasUnpublished) {
            const draftData = await loadDraft(selectedPage);

            // Check active status again
            if (draftData && isActive) {
              // Also sync draft data with manifest
              const draftSyncedComponents = [...draftData.components];
              const draftExistingIds = new Set(draftData.components.map(c => c.id));

              manifestComponents.forEach(({ schemaKey, componentName, occurrenceCount }) => {
                const schema = availableSchemas.find(s => s.key === schemaKey);
                if (!schema) return;

                for (let i = 0; i < occurrenceCount; i++) {
                  const deterministicId = `${schemaKey}-${i}`;
                  if (!draftExistingIds.has(deterministicId)) {
                    const newComponent: ComponentData = {
                      id: deterministicId,
                      schemaName: schema.name,
                      data: {}
                    };
                    draftSyncedComponents.push(newComponent);
                  }
                }
              });

              updatePageData({ components: draftSyncedComponents });
              loadTranslationDataFromComponents(draftSyncedComponents);
              setHasChanges(true);
              return;
            }
          }

          updatePageData(syncedData);
          loadTranslationDataFromComponents(syncedData.components);
          setHasChanges(false);
        }
      } catch (error) {
        if (!isActive) return;
        console.error('Failed to load page:', error);
        const fallbackData = initialData[selectedPage] || { components: [] };
        updatePageData(fallbackData);
        loadTranslationDataFromComponents(fallbackData.components);
        setHasChanges(false);
      } finally {
        if (isActive) {
          // Clear form data when loading a new page
          setComponentFormData({});

          // Ensure minimum 300ms loading time for smooth transitions
          const elapsedTime = Date.now() - loadStartTimeRef.current;
          const remainingTime = Math.max(0, 300 - elapsedTime);

          const timeoutId1 = setTimeout(() => {
            if (!isActive) return;

            setLoading(false);

            // Wait for spinner to fade out (15ms)
            const timeoutId2 = setTimeout(() => {
              if (!isActive) return;
              setShowContent(true);

              // Wait for render cycle then fade in content
              const timeoutId3 = setTimeout(() => {
                if (!isActive) return;
                setContentVisible(true);
              }, 5);
              timeoutIdsRef.current.push(timeoutId3);
            }, 15);
            timeoutIdsRef.current.push(timeoutId2);

            // Mark initial load as complete after all state is cleared
            isInitialLoadRef.current = false;
          }, remainingTime);
          timeoutIdsRef.current.push(timeoutId1);
        }
      }
    };

    loadPage();

    return () => {
      isActive = false;
      // Clear pending timeouts on unmount/re-run
      timeoutIdsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutIdsRef.current = [];
    };
  }, [selectedPage, initialData, clearTranslationData, closeEdit]);

  const handleComponentDataChange = useCallback((componentId: string, formData: Record<string, any>) => {
    setComponentFormData(prev => ({
      ...prev,
      [componentId]: formData
    }));
  }, []);

  const handleRenameComponent = (id: string, alias: string) => {
    setPageData(prev => ({
      components: prev.components.map(comp =>
        comp.id === id ? { ...comp, alias: alias.trim() || undefined } : comp
      )
    }));
    setHasChanges(true);
  };

  const handlePublished = () => {
    setHasChanges(false);
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {hasChanges && !isDevelopmentMode() && (
        <Alert>
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Draft Changes</h3>
              <p className="text-sm mt-1">
                Your changes are saved to a draft branch. Click publish to make them live.
              </p>
            </div>
            <div className="flex gap-2 ml-4">
              <PublishButton onPublished={handlePublished} />
            </div>
          </div>
        </Alert>
      )}

      {Object.keys(validationErrors).length > 0 && (
        <Alert
          variant="destructive"
          className={cn(
            validationContext ? "cursor-pointer hover:bg-destructive/10 transition-colors" : ""
          )}
          onClick={() => validationContext?.openErrorSidebar()}
        >
          <AlertTriangle className="h-4 w-4" />
          <div className="flex items-center justify-between w-full">
            <div>
              <span className="font-semibold">
                {Object.values(validationErrors).reduce((acc, errs) => acc + Object.keys(errs).length, 0)} validation error(s)
              </span>
              <span className="ml-2 opacity-80">
                Please fix the errors before saving.
              </span>
            </div>
            {validationContext && (
              <Button variant="ghost" size="sm" className="shrink-0 -my-1 text-destructive hover:text-destructive hover:bg-destructive/20">
                View all →
              </Button>
            )}
          </div>
        </Alert>
      )}

      {editState?.isOpen && (
        <RepeaterItemEditView
          externalErrors={editState?.componentData?.id ? validationErrors[editState.componentData.id] : undefined}
        />
      )}

      <div className={cn("space-y-8", editState?.isOpen && "hidden")}>
        {(() => {
          // Show loading spinner during initial load to prevent layout shift
          if (loading || !showContent) {
            return (
              <div
                key="loading"
                className={cn(
                  "py-20 flex justify-center items-center transition-opacity duration-300",
                  loading ? "opacity-100" : "opacity-0"
                )}
              >
                <Spinner className="size-6" />
              </div>
            );
          }

          return (
            <>
              {pageData.components.length === 0 ? (
                <div
                  key="no-content"
                  className={cn(
                    "py-20 text-center transition-opacity duration-300",
                    contentVisible ? "opacity-100" : "opacity-0"
                  )}
                >
                  <p className="text-lg text-muted-foreground/70">No components detected in this page. Import components from @/components/capsulo/ in your .astro file to manage them here.</p>
                </div>
              ) : (
                <div
                  key="content"
                  className={cn(
                    "transition-opacity duration-300 space-y-8",
                    contentVisible ? "opacity-100" : "opacity-0"
                  )}
                >
                  {pageData.components.map(component => {
                    const schema = availableSchemas.find(s => s.name === component.schemaName);

                    return (
                      schema && (
                        <InlineComponentForm
                          key={`${component.id}-${isTranslationMode}`}
                          component={component}
                          schema={schema}
                          fields={schema.fields}
                          onDataChange={handleComponentDataChange}
                          onRename={handleRenameComponent}
                          validationErrors={validationErrors[component.id]}
                          highlightedField={
                            validationContext?.activeErrorComponentId === component.id
                              ? validationContext.activeErrorField ?? undefined
                              : undefined
                          }
                          highlightRequestId={
                            validationContext?.activeErrorComponentId === component.id
                              ? validationContext?.lastNavigationId
                              : undefined
                          }
                        />
                      )
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
};

export const CMSManager = React.memo(CMSManagerComponent, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.selectedPage === nextProps.selectedPage &&
    prevProps.githubOwner === nextProps.githubOwner &&
    prevProps.githubRepo === nextProps.githubRepo &&
    prevProps.initialData === nextProps.initialData &&
    prevProps.availablePages === nextProps.availablePages &&
    prevProps.componentManifest === nextProps.componentManifest &&
    prevProps.onPageChange === nextProps.onPageChange &&
    prevProps.onPageDataUpdate === nextProps.onPageDataUpdate &&
    prevProps.onSaveRef === nextProps.onSaveRef &&
    prevProps.onReorderRef === nextProps.onReorderRef &&
    prevProps.onHasChanges === nextProps.onHasChanges
  );
});
