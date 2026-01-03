import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getAllGlobalSchemas } from '@/lib/form-builder';
import type { ComponentData, GlobalData, Schema } from '@/lib/form-builder';
import { useDebouncedValueWithStatus } from '@/lib/hooks/useDebouncedCallback';
import config from '@/capsulo.config';
import {
  saveGlobals,
  loadGlobals
} from '@/lib/cms-storage-adapter';
import { saveGlobalsDraft, getGlobalsDraft } from '@/lib/cms-local-changes';
import { InlineComponentForm } from './InlineComponentForm';
import { cn } from '@/lib/utils';
import { useTranslationData } from '@/lib/form-builder/context/TranslationDataContext';
import { useTranslation } from '@/lib/form-builder/context/TranslationContext';
import { useRepeaterEdit } from '@/lib/form-builder/context/RepeaterEditContext';
import { RepeaterItemEditView } from '@/lib/form-builder/fields/Repeater/variants/RepeaterItemEditView';
import { flattenFields } from '@/lib/form-builder/core/fieldHelpers';
import { fieldToZod } from '@/lib/form-builder/fields/ZodRegistry';
import { useValidationOptional, type ValidationError } from '@/lib/form-builder/context/ValidationContext';
import '@/lib/form-builder/schemas';

// Shared hooks
import {
  useFormChangeDetection,
  useTranslationChangeDetection,
  useTranslationMerge,
  useDraftPersistence,
  useSaveStatusReporting
} from '@/lib/hooks/content-manager';

// Shared UI components
import { DraftChangesAlert, ValidationErrorsAlert } from './shared';

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
  /** Called after autosave completes to revalidate drafts */
  onRevalidate?: () => void;
}

const EMPTY_GLOBAL_DATA: GlobalData = { variables: [] };

const GlobalVariablesManagerComponent: React.FC<GlobalVariablesManagerProps> = ({
  initialData = EMPTY_GLOBAL_DATA,
  onGlobalDataUpdate,
  onSaveRef,
  onHasChanges,
  onSaveStatusChange,
  onRevalidate,
  highlightedField,
  onFormDataChange,
  githubOwner,
  githubRepo
}) => {
  const [globalData, setGlobalData] = useState<GlobalData>(initialData);
  const [availableSchemas] = useState<Schema[]>(getAllGlobalSchemas());
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [variableFormData, setVariableFormData] = useState<Record<string, Record<string, any>>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, Record<string, string>>>({});
  const [deletedVariableIds, setDeletedVariableIds] = useState<Set<string>>(new Set());
  const [saveTimestamp, setSaveTimestamp] = useState<number>(Date.now());
  const loadingRef = useRef(false);
  const isInitialLoadRef = useRef(true);

  // Debounced variableFormData for change detection
  const [debouncedVariableFormData, isDebouncing] = useDebouncedValueWithStatus(variableFormData, config.ui.autoSaveDebounceMs);

  // Get translation data to track translation changes
  const { translationData, clearTranslationData, setTranslationValue } = useTranslationData();
  const { defaultLocale, isTranslationMode, availableLocales } = useTranslation();
  const { editState } = useRepeaterEdit();

  // Validation context (optional - may not be wrapped in ValidationProvider)
  const validationContext = useValidationOptional();

  // Debounced translationData for draft persistence
  const [debouncedTranslationData, isTranslationDebouncing] = useDebouncedValueWithStatus(translationData, config.ui.autoSaveDebounceMs);

  // Use shared hook for save status reporting
  useSaveStatusReporting({
    isFormDebouncing: isDebouncing,
    isTranslationDebouncing,
    onSaveStatusChange
  });

  // Compute filtered global data (excluding deleted variables)
  const filteredGlobalData = useMemo<GlobalData>(() => ({
    variables: globalData.variables.filter(v => !deletedVariableIds.has(v.id))
  }), [globalData.variables, deletedVariableIds]);

  // Use shared hook for translation merging (display purposes)
  const displayVariables = useTranslationMerge({
    entities: filteredGlobalData.variables,
    debouncedTranslationData,
    config: {
      schemas: availableSchemas,
      defaultLocale,
      availableLocales
    }
  });

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

  // Use shared hooks for change detection
  const hasFormChanges = useFormChangeDetection({
    debouncedFormData: debouncedVariableFormData,
    entities: globalData.variables,
    config: { defaultLocale }
  });

  const hasTranslationChanges = useTranslationChangeDetection({
    translationData,
    defaultLocale
  });

  // Combine change detection
  useEffect(() => {
    if (isInitialLoadRef.current && !hasFormChanges && !hasTranslationChanges) {
      return;
    }
    const hasAnyChanges = hasFormChanges || deletedVariableIds.size > 0 || hasTranslationChanges;
    setHasChanges(hasAnyChanges);
    onHasChanges?.(hasAnyChanges);
  }, [hasFormChanges, deletedVariableIds.size, hasTranslationChanges, onHasChanges]);

  // Use shared hook for draft persistence
  useDraftPersistence({
    hasChanges,
    isInitialLoad: isInitialLoadRef.current,
    entities: filteredGlobalData.variables,
    debouncedFormData: debouncedVariableFormData,
    debouncedTranslationData,
    config: {
      schemas: availableSchemas,
      defaultLocale,
      saveDraft: (mergedEntities) => {
        saveGlobalsDraft({ variables: mergedEntities });
      },
      onRevalidate
    }
  });

  // Save function
  const handleSave = useCallback(async () => {
    if (saving || !isReady) return;

    // First, validate all variables
    const errors: Record<string, Record<string, string>> = {};
    const errorDetailsList: ValidationError[] = [];
    let hasAnyErrors = false;

    globalData.variables
      .filter(v => !deletedVariableIds.has(v.id))
      .forEach(variable => {
        const formData = variableFormData[variable.id];
        if (!formData) return;

        const schema = availableSchemas.find(s => s.key === 'globals' || s.name === variable.schemaName);
        if (!schema) return;

        const dataFields = flattenFields(schema.fields);
        const variableErrors: Record<string, string> = {};

        dataFields.forEach(field => {
          const zodSchema = fieldToZod(field, formData);
          let value = formData[field.name];

          if (value === undefined) {
            const variableFieldValue = variable.data[field.name]?.value;
            if (variableFieldValue && typeof variableFieldValue === 'object' && !Array.isArray(variableFieldValue)) {
              value = variableFieldValue[defaultLocale];
            } else {
              value = variableFieldValue;
            }
          }

          const result = zodSchema.safeParse(value);

          if (!result.success) {
            result.error.errors.forEach(issue => {
              const pathParts = [field.name, ...issue.path];
              const path = pathParts.join('.');
              variableErrors[path] = issue.message;

              const fieldLabel = 'label' in field && field.label ? String(field.label) : field.name;
              errorDetailsList.push({
                componentId: variable.id,
                componentName: variable.alias || 'Global Variables',
                fieldPath: path,
                fieldLabel: fieldLabel,
                tabName: undefined,
                tabIndex: undefined,
                message: issue.message,
              });
            });
            hasAnyErrors = true;
          }
        });

        if (Object.keys(variableErrors).length > 0) {
          errors[variable.id] = variableErrors;
        }
      });

    if (hasAnyErrors) {
      setValidationErrors(errors);
      if (validationContext) {
        validationContext.setValidationErrors(errors, errorDetailsList);
      }
      return;
    }

    setValidationErrors({});
    if (validationContext) {
      validationContext.clearValidationErrors();
    }

    setSaving(true);
    try {
      const updatedVariables = globalData.variables
        .filter(v => !deletedVariableIds.has(v.id))
        .map(variable => {
          const formData = variableFormData[variable.id];
          if (!formData) return variable;

          const schema = availableSchemas.find(s => s.key === 'globals' || s.name === variable.schemaName);
          const dataFields = schema ? flattenFields(schema.fields) : [];

          const updatedData = { ...variable.data };
          Object.entries(formData).forEach(([key, value]) => {
            const fieldDef = dataFields.find(f => f.name === key);
            const isTranslatable = (fieldDef && 'translatable' in fieldDef && fieldDef.translatable) || false;

            if (isTranslatable) {
              const fieldTranslations: Record<string, any> = {};
              let hasTranslations = false;

              const existingFieldValue = variable.data[key]?.value;
              if (existingFieldValue && typeof existingFieldValue === 'object' && !Array.isArray(existingFieldValue)) {
                Object.entries(existingFieldValue).forEach(([locale, val]) => {
                  fieldTranslations[locale] = val;
                  hasTranslations = true;
                });
              }

              const cleanedValue = value === '' ? undefined : value;
              if (cleanedValue !== undefined) {
                fieldTranslations[defaultLocale] = cleanedValue;
                hasTranslations = true;
              }

              Object.entries(translationData).forEach(([locale, localeData]) => {
                if (locale === defaultLocale) return;
                const variableTranslations = localeData[variable.id];
                if (variableTranslations && variableTranslations[key] !== undefined) {
                  let translationValue = variableTranslations[key];
                  if (translationValue === null) translationValue = '';
                  fieldTranslations[locale] = translationValue;
                  hasTranslations = true;
                }
              });

              if (hasTranslations && Object.keys(fieldTranslations).length > 1) {
                updatedData[key] = {
                  type: fieldDef?.type || 'input',
                  translatable: true,
                  value: fieldTranslations
                };
              } else if (hasTranslations) {
                updatedData[key] = {
                  type: fieldDef?.type || 'input',
                  translatable: true,
                  value: fieldTranslations[defaultLocale]
                };
              } else {
                updatedData[key] = {
                  type: fieldDef?.type || 'input',
                  translatable: true,
                  value: undefined
                };
              }
            } else {
              if (updatedData[key]) {
                updatedData[key] = {
                  ...updatedData[key],
                  value: value === '' ? undefined : value
                };
              } else {
                updatedData[key] = {
                  type: fieldDef?.type || 'input',
                  translatable: false,
                  value: value === '' ? undefined : value
                };
              }
            }
          });

          return { ...variable, data: updatedData };
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
  }, [globalData, variableFormData, deletedVariableIds, saving, isReady, clearTranslationData, availableSchemas, translationData, defaultLocale, validationContext]);

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
        if (fieldData.value && typeof fieldData.value === 'object' && !Array.isArray(fieldData.value)) {
          Object.entries(fieldData.value).forEach(([locale, value]) => {
            if (availableLocales.includes(locale) && locale !== defaultLocale && value !== undefined && value !== '') {
              setTranslationValue(fieldName, locale, value, variable.id);
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
      setIsReady(false);
      isInitialLoadRef.current = true;

      try {
        const localDraft = await getGlobalsDraft();
        let loadedData: GlobalData | null = null;
        let isDraft = false;

        if (localDraft) {
          console.log('[GlobalVariablesManager] Loading from IndexedDB draft');
          loadedData = localDraft;
          isDraft = true;
        } else {
          loadedData = await loadGlobals();
        }

        let dataToUse = loadedData || initialData;
        let syncedVariables = [...dataToUse.variables];
        const existingVariable = syncedVariables.find(v => v.id === 'globals');
        const globalSchema = availableSchemas.find(s => s.key === 'globals');

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

        const syncedData: GlobalData = { variables: syncedVariables };
        setGlobalData(syncedData);
        setVariableFormData({});
        setDeletedVariableIds(new Set());
        setHasChanges(isDraft);
        loadTranslationDataFromVariables(syncedVariables);
      } catch (error) {
        console.error('Failed to load global variables:', error);
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
        loadingRef.current = false;
        setIsReady(true);
        isInitialLoadRef.current = false;
      }
    };

    loadGlobalVariables();

    return () => {
      loadingRef.current = false;
    };
  }, [initialData, availableSchemas, loadTranslationDataFromVariables]);

  const handleVariableDataChange = useCallback((variableId: string, formData: Record<string, any>) => {
    setVariableFormData(prev => ({
      ...prev,
      [variableId]: formData
    }));
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
      <DraftChangesAlert hasChanges={hasChanges} onPublished={handlePublished} />
      <ValidationErrorsAlert validationErrors={validationErrors} validationContext={validationContext} />

      {editState?.isOpen && (
        <RepeaterItemEditView
          externalErrors={editState?.componentData?.id ? validationErrors[editState.componentData.id] : undefined}
        />
      )}

      <div className={cn("space-y-8 transition-opacity duration-200", editState?.isOpen && "hidden", isReady ? "opacity-100" : "opacity-0")}>
        {(() => {
          const variable = displayVariables.find(v => v.id === 'globals');

          if (!variable) {
            return (
              <div className="py-20 text-center">
                <p className="text-lg text-muted-foreground/70">
                  No global variables found. Create globals.schema.tsx in src/config/globals/ to manage them here.
                </p>
              </div>
            );
          }

          const schema = availableSchemas.find(s => s.key === 'globals' || s.name === variable.schemaName);

          if (!schema) {
            return (
              <div className="py-20 text-center">
                <p className="text-lg text-muted-foreground/70">
                  Global variables schema not found. Create globals.schema.tsx in src/config/globals/.
                </p>
              </div>
            );
          }

          return (
            <InlineComponentForm
              key={`${variable.id}-${saveTimestamp}-${isTranslationMode}`}
              component={variable}
              schema={schema}
              fields={schema.fields}
              onDataChange={handleVariableDataChange}
              onRename={handleRenameVariable}
              validationErrors={validationErrors[variable.id]}
              highlightedField={
                validationContext?.activeErrorComponentId === variable.id
                  ? validationContext.activeErrorField ?? undefined
                  : undefined
              }
              highlightRequestId={
                validationContext?.activeErrorComponentId === variable.id
                  ? validationContext?.lastNavigationId
                  : undefined
              }
            />
          );
        })()}
      </div>
    </div>
  );
};

export const GlobalVariablesManager = React.memo(GlobalVariablesManagerComponent);
