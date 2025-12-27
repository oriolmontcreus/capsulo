import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getAllGlobalSchemas } from '@/lib/form-builder';
import type { ComponentData, GlobalData, Schema } from '@/lib/form-builder';
import { useDebouncedValueWithStatus } from '@/lib/hooks/useDebouncedCallback';
import config from '../../../capsulo.config';
import {
  saveGlobals,
  loadGlobals,
  isDevelopmentMode
} from '@/lib/cms-storage-adapter';
import { saveGlobalsDraft, getGlobalsDraft } from '@/lib/cms-local-changes';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { AlertTriangle } from 'lucide-react';
import { InlineComponentForm } from './InlineComponentForm';
import { PublishButton } from './PublishButton';
import { cn } from '@/lib/utils';
import { useTranslationData } from '@/lib/form-builder/context/TranslationDataContext';
import { useTranslation } from '@/lib/form-builder/context/TranslationContext';
import { useRepeaterEdit } from '@/lib/form-builder/context/RepeaterEditContext';
import { RepeaterItemEditView } from '@/lib/form-builder/fields/Repeater/variants/RepeaterItemEditView';
import { flattenFields } from '@/lib/form-builder/core/fieldHelpers';
import { fieldToZod } from '@/lib/form-builder/fields/ZodRegistry';
import '@/lib/form-builder/schemas';

interface GlobalVariablesManagerProps {
  initialData?: GlobalData;
  onGlobalDataUpdate?: (newGlobalData: GlobalData) => void;
  onSaveRef?: React.RefObject<{ save: () => Promise<void> }>;
  onHasChanges?: (hasChanges: boolean) => void;
  onSaveStatusChange?: (isDebouncing: boolean) => void;
  highlightedField?: string;
  onFormDataChange?: (formData: Record<string, any>) => void;
  githubOwner?: string;
  githubRepo?: string;
}

const EMPTY_GLOBAL_DATA: GlobalData = { variables: [] };

const GlobalVariablesManagerComponent: React.FC<GlobalVariablesManagerProps> = ({
  initialData = EMPTY_GLOBAL_DATA,
  onGlobalDataUpdate,
  onSaveRef,
  onHasChanges,
  onSaveStatusChange,
  highlightedField,
  onFormDataChange,
  githubOwner,
  githubRepo
}) => {
  const [globalData, setGlobalData] = useState<GlobalData>(initialData);
  const [availableSchemas] = useState<Schema[]>(getAllGlobalSchemas());
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [variableFormData, setVariableFormData] = useState<Record<string, Record<string, any>>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, Record<string, string>>>({});
  const [deletedVariableIds, setDeletedVariableIds] = useState<Set<string>>(new Set());
  const [saveTimestamp, setSaveTimestamp] = useState<number>(Date.now());
  const loadingRef = useRef(false);
  const loadStartTimeRef = useRef<number>(0);
  const timeoutIdsRef = useRef<NodeJS.Timeout[]>([]);
  const isInitialLoadRef = useRef(true);

  // Debounced variableFormData for change detection
  const [debouncedVariableFormData, isDebouncing] = useDebouncedValueWithStatus(variableFormData, config.ui.autoSaveDebounceMs);

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
      // After Block period, report actual status
      onSaveStatusChange?.(isDebouncing);
    }
  }, [isDebouncing, saveStatusBlocked, onSaveStatusChange]);



  // Get translation data to track translation changes
  const { translationData, clearTranslationData, setTranslationValue } = useTranslationData();
  const { defaultLocale, isTranslationMode, availableLocales } = useTranslation();
  const { editState } = useRepeaterEdit();

  // Compute filtered global data (excluding deleted variables)
  const filteredGlobalData = useMemo<GlobalData>(() => ({
    variables: globalData.variables.filter(v => !deletedVariableIds.has(v.id))
  }), [globalData.variables, deletedVariableIds]);

  // Notify parent when filtered global data changes
  const prevFilteredDataRef = useRef<GlobalData>(EMPTY_GLOBAL_DATA);
  const onGlobalDataUpdateRef = useRef(onGlobalDataUpdate);
  onGlobalDataUpdateRef.current = onGlobalDataUpdate;

  useEffect(() => {
    const prevData = prevFilteredDataRef.current;
    const currentData = filteredGlobalData;

    const prevIds = prevData.variables.map(v => `${v.id}:${v.alias || ''}`).join(',');
    const currentIds = currentData.variables.map(v => `${v.id}:${v.alias || ''}`).join(',');

    if (prevIds !== currentIds) {
      onGlobalDataUpdateRef.current?.(currentData);
      prevFilteredDataRef.current = currentData;
    }
  }, [filteredGlobalData]);

  // Form change detection
  const hasFormChanges = useMemo(() => {
    return Object.keys(debouncedVariableFormData).some(variableId => {
      const formData = debouncedVariableFormData[variableId];
      const variable = globalData.variables.find(v => v.id === variableId);

      if (!variable || !formData) return false;

      return Object.entries(formData).some(([key, value]) => {
        const fieldMeta = variable.data[key];
        const variableFieldValue = fieldMeta?.value;

        const normalizedFormValue = value === '' ? undefined : value;
        const normalizedVariableValue = variableFieldValue === '' ? undefined : variableFieldValue;

        // Check if this is a translatable field with translation object
        const isTranslatableObject =
          fieldMeta?.translatable &&
          normalizedVariableValue &&
          typeof normalizedVariableValue === 'object' &&
          !Array.isArray(normalizedVariableValue);

        let isDifferent = false;
        // Handle translation format where value is an object with locale keys
        if (isTranslatableObject) {
          // Compare with default locale value from translation object
          const localeValue = normalizedVariableValue[defaultLocale];
          const normalizedLocaleValue = localeValue === '' ? undefined : localeValue;
          isDifferent = normalizedLocaleValue !== normalizedFormValue;
        } else {
          // Handle simple value or non-translatable structured objects
          // For structured objects (like fileUpload), use JSON comparison
          if (normalizedVariableValue && typeof normalizedVariableValue === 'object' &&
            normalizedFormValue && typeof normalizedFormValue === 'object') {
            isDifferent = JSON.stringify(normalizedVariableValue) !== JSON.stringify(normalizedFormValue);
          } else {
            isDifferent = normalizedVariableValue !== normalizedFormValue;
          }
        }

        return isDifferent;
      });
    });
  }, [debouncedVariableFormData, globalData, defaultLocale]);

  // Simple translation change detection
  const hasTranslationChanges = useMemo(() => {
    return Object.entries(translationData).some(([locale, localeData]) => {
      if (locale === defaultLocale) return false;
      // Any translation data (including empty values) should be considered a change
      return Object.keys(localeData).length > 0;
    });
  }, [translationData, defaultLocale]);

  useEffect(() => {
    // Skip change detection during initial load
    if (isInitialLoadRef.current && !hasFormChanges && !hasTranslationChanges) {
      return;
    }
    const hasAnyChanges = hasFormChanges || deletedVariableIds.size > 0 || hasTranslationChanges;
    setHasChanges(hasAnyChanges);
    onHasChanges?.(hasAnyChanges);
  }, [hasFormChanges, deletedVariableIds.size, hasTranslationChanges, onHasChanges]);

  // Save changes to localStorage for persistence across page navigation
  // This allows the Changes viewer to access uncommitted edits
  useEffect(() => {
    if (!hasChanges) return;

    // Build global data with form edits merged in
    const mergedVariables = globalData.variables
      .filter(v => !deletedVariableIds.has(v.id))
      .map(variable => {
        const formData = debouncedVariableFormData[variable.id];
        if (!formData) return variable;

        const schema = availableSchemas.find(s => s.key === 'globals' || s.name === variable.schemaName);
        if (!schema) return variable;

        // Merge form data into variable data
        const mergedData: Record<string, { type: any; translatable?: boolean; value: any }> = { ...variable.data };

        Object.entries(formData).forEach(([fieldName, value]) => {
          const existingField = variable.data[fieldName];
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

        return { ...variable, data: mergedData };
      });

    const draftData: GlobalData = { variables: mergedVariables };

    saveGlobalsDraft(draftData);
  }, [hasChanges, globalData.variables, debouncedVariableFormData, deletedVariableIds, availableSchemas, defaultLocale]);

  // Save function
  const handleSave = useCallback(async () => {
    if (saving || loading) return;

    // First, validate all variables
    const errors: Record<string, Record<string, string>> = {};
    let hasAnyErrors = false;

    globalData.variables
      .filter(v => !deletedVariableIds.has(v.id))
      .forEach(variable => {
        const formData = variableFormData[variable.id];
        // If we have form data, we need to validate it
        if (!formData) return;

        const schema = availableSchemas.find(s => s.key === 'globals' || s.name === variable.schemaName);
        if (!schema) return;

        const dataFields = flattenFields(schema.fields);
        const variableErrors: Record<string, string> = {};

        dataFields.forEach(field => {
          const zodSchema = fieldToZod(field, formData);
          let value = formData[field.name];

          // If no form data, get from variable data
          if (value === undefined) {
            const variableFieldValue = variable.data[field.name]?.value;
            // Handle translation format where value can be an object with locale keys
            if (variableFieldValue && typeof variableFieldValue === 'object' && !Array.isArray(variableFieldValue)) {
              // Use default locale value from translation object
              value = variableFieldValue[defaultLocale];
            } else {
              value = variableFieldValue;
            }
          }

          const result = zodSchema.safeParse(value);

          if (!result.success) {
            // Iterating over all errors to handle nested fields
            result.error.errors.forEach(issue => {
              const pathParts = [field.name, ...issue.path];
              const path = pathParts.join('.');
              variableErrors[path] = issue.message;
            });
            hasAnyErrors = true;
          }
        });

        if (Object.keys(variableErrors).length > 0) {
          errors[variable.id] = variableErrors;
        }
      });

    // If there are errors, show them and don't save
    if (hasAnyErrors) {
      setValidationErrors(errors);
      return;
    }

    // Clear any previous errors
    setValidationErrors({});

    setSaving(true);
    try {
      const updatedVariables = globalData.variables
        .filter(v => !deletedVariableIds.has(v.id))
        .map(variable => {
          const formData = variableFormData[variable.id];
          if (!formData) return variable;

          // Get the schema and flatten fields to get only data fields (not layouts)
          const schema = availableSchemas.find(s => s.key === 'globals' || s.name === variable.schemaName);
          const dataFields = schema ? flattenFields(schema.fields) : [];

          const updatedData = { ...variable.data };
          Object.entries(formData).forEach(([key, value]) => {
            const fieldDef = dataFields.find(f => f.name === key);
            const isTranslatable = (fieldDef && 'translatable' in fieldDef && fieldDef.translatable) || false;

            // Handle translations for translatable fields
            if (isTranslatable) {
              // Check if we have translations for this field
              const fieldTranslations: Record<string, any> = {};
              let hasTranslations = false;

              // First, preserve existing translations from variable data (but they can be overridden later)
              const existingFieldValue = variable.data[key]?.value;
              if (existingFieldValue && typeof existingFieldValue === 'object' && !Array.isArray(existingFieldValue)) {
                // Copy all existing translations (including empty ones)
                Object.entries(existingFieldValue).forEach(([locale, val]) => {
                  fieldTranslations[locale] = val;
                  hasTranslations = true;
                });
              }

              // Add/update default locale value from form data
              const cleanedValue = value === '' ? undefined : value;
              if (cleanedValue !== undefined) {
                fieldTranslations[defaultLocale] = cleanedValue;
                hasTranslations = true;
              }

              // Add/update translations from current translation context (this will override existing ones)
              Object.entries(translationData).forEach(([locale, localeData]) => {
                if (locale !== defaultLocale && localeData[key] !== undefined) {
                  let translationValue = localeData[key];

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
              if (hasTranslations && Object.keys(fieldTranslations).length > 1) {
                // Multiple locales - store as object
                updatedData[key] = {
                  type: fieldDef?.type || 'input',
                  translatable: true,
                  value: fieldTranslations
                };
              } else if (hasTranslations) {
                // Only default locale - store as simple value
                updatedData[key] = {
                  type: fieldDef?.type || 'input',
                  translatable: true,
                  value: fieldTranslations[defaultLocale]
                };
              } else {
                // No value at all
                updatedData[key] = {
                  type: fieldDef?.type || 'input',
                  translatable: true,
                  value: undefined
                };
              }
            } else {
              // Non-translatable field - simple update
              if (updatedData[key]) {
                updatedData[key] = {
                  ...updatedData[key],
                  value: value === '' ? undefined : value
                };
              } else {
                // Field doesn't exist yet, create it with metadata from schema
                updatedData[key] = {
                  type: fieldDef?.type || 'input',
                  translatable: false,
                  value: value === '' ? undefined : value
                };
              }
            }
          });

          return {
            ...variable,
            data: updatedData
          };
        });

      const dataToSave: GlobalData = { variables: updatedVariables };
      await saveGlobals(dataToSave);

      setGlobalData(dataToSave);
      setVariableFormData({});
      setDeletedVariableIds(new Set());
      setHasChanges(false);
      setSaveTimestamp(Date.now());
      clearTranslationData();
    } catch (error) {
      console.error('Failed to save global variables:', error);
    } finally {
      setSaving(false);
    }
  }, [globalData, variableFormData, deletedVariableIds, saving, loading, clearTranslationData, availableSchemas, translationData, defaultLocale]);

  // Expose save function via ref
  useEffect(() => {
    if (onSaveRef) {
      onSaveRef.current = { save: handleSave };
    }
  }, [onSaveRef, handleSave]);

  // Function to load translation data from existing variable data
  const loadTranslationDataFromVariables = useCallback((variables: ComponentData[]) => {
    variables.forEach(variable => {
      Object.entries(variable.data).forEach(([fieldName, fieldData]) => {
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

  // Load global data and auto-initialize from schemas
  useEffect(() => {
    const loadGlobalVariables = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setShowContent(false);
      setContentVisible(false);
      loadStartTimeRef.current = Date.now();
      isInitialLoadRef.current = true;

      try {
        // Check for local draft first (preserves unsaved changes on reload)
        const localDraft = getGlobalsDraft();
        let loadedData: GlobalData | null = null;
        let isDraft = false;

        if (localDraft) {
          console.log('[GlobalVariablesManager] Loading from localStorage draft');
          loadedData = localDraft;
          isDraft = true;
        } else {
          loadedData = await loadGlobals();
        }

        let dataToUse = loadedData || initialData;

        // Auto-initialize the single global variable from schema if it doesn't exist
        // There should only be one global variable with id "globals"
        let syncedVariables = [...dataToUse.variables];
        const existingVariable = syncedVariables.find(v => v.id === 'globals');

        // Get the single global schema (should only be one)
        const globalSchema = availableSchemas.find(s => s.key === 'globals');

        if (!existingVariable && globalSchema) {
          // Auto-create the global variable entry
          const newVariable: ComponentData = {
            id: 'globals',
            schemaName: globalSchema.name,
            data: {}
          };
          syncedVariables = [newVariable];
        } else if (existingVariable && globalSchema) {
          // Ensure the variable uses the correct schema name
          const updated = { ...existingVariable, schemaName: globalSchema.name };
          syncedVariables = [updated];
        }

        const syncedData: GlobalData = { variables: syncedVariables };
        setGlobalData(syncedData);
        setVariableFormData({});
        setDeletedVariableIds(new Set());
        setHasChanges(isDraft);
        loadTranslationDataFromVariables(syncedVariables);
      } catch (error) {
        console.error('Failed to load global variables:', error);
        // Even on error, try to initialize from schema
        const globalSchema = availableSchemas.find(s => s.key === 'globals');
        let syncedVariables = [...initialData.variables];
        const existingVariable = syncedVariables.find(v => v.id === 'globals');

        if (!existingVariable && globalSchema) {
          const newVariable: ComponentData = {
            id: 'globals',
            schemaName: globalSchema.name,
            data: {}
          };
          syncedVariables = [newVariable];
        } else if (existingVariable && globalSchema) {
          const updated = { ...existingVariable, schemaName: globalSchema.name };
          syncedVariables = [updated];
        }

        setGlobalData({ variables: syncedVariables });
        setHasChanges(false);
        loadTranslationDataFromVariables(syncedVariables);
      } finally {
        // Ensure minimum 300ms loading time for smooth transitions
        const elapsedTime = Date.now() - loadStartTimeRef.current;
        const remainingTime = Math.max(0, 300 - elapsedTime);

        const timeoutId1 = setTimeout(() => {
          loadingRef.current = false;
          setLoading(false);

          // Wait for spinner to fade out (15ms)
          const timeoutId2 = setTimeout(() => {
            setShowContent(true);

            // Wait for render cycle then fade in content
            const timeoutId3 = setTimeout(() => {
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
    };

    loadGlobalVariables();

    return () => {
      // Clear pending timeouts on unmount
      timeoutIdsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutIdsRef.current = [];
      loadingRef.current = false;
    };
  }, [initialData, availableSchemas, loadTranslationDataFromVariables]);

  const handleVariableDataChange = useCallback((variableId: string, formData: Record<string, any>) => {
    setVariableFormData(prev => ({
      ...prev,
      [variableId]: formData
    }));
    // Expose formData to parent for search
    if (onFormDataChange) {
      onFormDataChange(formData);
    }
  }, [onFormDataChange]);

  const handleDeleteVariable = (id: string) => {
    setDeletedVariableIds(prev => new Set(prev).add(id));
    setVariableFormData(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const handleRenameVariable = (id: string, alias: string) => {
    setGlobalData(prev => ({
      variables: prev.variables.map(v =>
        v.id === id ? { ...v, alias: alias.trim() || undefined } : v
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
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <span className="font-semibold">
              {Object.values(validationErrors).reduce((acc, errs) => acc + Object.keys(errs).length, 0)} validation error(s)
            </span>
            <span className="ml-2 opacity-80">
              Please fix the errors before saving.
            </span>
          </div>
        </Alert>
      )}

      {editState?.isOpen && (
        <RepeaterItemEditView />
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

          // Get the single global variable (should only be one with id "globals")
          const variable = globalData.variables.find(v => v.id === 'globals' && !deletedVariableIds.has(v.id));

          if (!variable) {
            return (
              <div
                key="no-variable"
                className={cn(
                  "py-20 text-center transition-opacity duration-300",
                  showContent ? "opacity-100" : "opacity-0"
                )}
              >
                <p className="text-lg text-muted-foreground/70">
                  No global variables found. Create globals.schema.tsx in src/config/globals/ to manage them here.
                </p>
              </div>
            );
          }

          const schema = availableSchemas.find(s => s.key === 'globals' || s.name === variable.schemaName);

          if (!schema) {
            return (
              <div
                key="no-schema"
                className={cn(
                  "py-20 text-center transition-opacity duration-300",
                  showContent ? "opacity-100" : "opacity-0"
                )}
              >
                <p className="text-lg text-muted-foreground/70">
                  Global variables schema not found. Create globals.schema.tsx in src/config/globals/.
                </p>
              </div>
            );
          }

          return (
            <div
              key="content"
              className={cn(
                "transition-opacity duration-300",
                contentVisible ? "opacity-100" : "opacity-0"
              )}
            >
              <InlineComponentForm
                key={`${variable.id}-${saveTimestamp}-${isTranslationMode}`}
                component={variable}
                schema={schema}
                fields={schema.fields}
                onDataChange={handleVariableDataChange}
                onRename={handleRenameVariable}
                validationErrors={validationErrors[variable.id]}
                highlightedField={highlightedField}
              />
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export const GlobalVariablesManager = React.memo(GlobalVariablesManagerComponent);

