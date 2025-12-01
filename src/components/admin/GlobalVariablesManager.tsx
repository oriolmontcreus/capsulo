import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getAllGlobalSchemas } from '@/lib/form-builder';
import type { ComponentData, GlobalData, Schema } from '@/lib/form-builder';
import {
  saveGlobals,
  loadGlobals,
  isDevelopmentMode
} from '@/lib/cms-storage-adapter';
import { Alert } from '@/components/ui/alert';
import { InlineComponentForm } from './InlineComponentForm';
import { PublishButton } from './PublishButton';
import { cn } from '@/lib/utils';
import { useTranslationData } from '@/lib/form-builder/context/TranslationDataContext';
import { useTranslation } from '@/lib/form-builder/context/TranslationContext';
import { useRepeaterEdit } from '@/lib/form-builder/context/RepeaterEditContext';
import { RepeaterItemEditView } from '@/lib/form-builder/fields/Repeater/variants/RepeaterItemEditView';
import '@/lib/form-builder/schemas';

interface GlobalVariablesManagerProps {
  initialData?: GlobalData;
  selectedVariable?: string;
  onVariableChange?: (variableId: string) => void;
  onGlobalDataUpdate?: (newGlobalData: GlobalData) => void;
  onSaveRef?: React.RefObject<{ save: () => Promise<void> }>;
  onHasChanges?: (hasChanges: boolean) => void;
  searchQuery?: string;
  highlightedField?: string;
  onFormDataChange?: (formData: Record<string, any>) => void;
  githubOwner?: string;
  githubRepo?: string;
}

const GlobalVariablesManagerComponent: React.FC<GlobalVariablesManagerProps> = ({
  initialData = { variables: [] },
  selectedVariable,
  onVariableChange,
  onGlobalDataUpdate,
  onSaveRef,
  onHasChanges,
  searchQuery = '',
  highlightedField,
  onFormDataChange
}) => {
  const [globalData, setGlobalData] = useState<GlobalData>(initialData);
  const [availableSchemas] = useState<Schema[]>(getAllGlobalSchemas());
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [variableFormData, setVariableFormData] = useState<Record<string, Record<string, any>>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, Record<string, string>>>({});
  const [deletedVariableIds, setDeletedVariableIds] = useState<Set<string>>(new Set());
  const [saveTimestamp, setSaveTimestamp] = useState<number>(Date.now());
  const loadingRef = useRef(false);

  // Get translation data to track translation changes
  const { translationData, clearTranslationData } = useTranslationData();
  const { defaultLocale, isTranslationMode } = useTranslation();
  const { editState } = useRepeaterEdit();

  // Compute filtered global data (excluding deleted variables)
  const filteredGlobalData = useMemo<GlobalData>(() => ({
    variables: globalData.variables.filter(v => !deletedVariableIds.has(v.id))
  }), [globalData.variables, deletedVariableIds]);

  // Notify parent when filtered global data changes
  const prevFilteredDataRef = useRef<GlobalData>({ variables: [] });
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
    return Object.keys(variableFormData).some(variableId => {
      const formData = variableFormData[variableId];
      const variable = globalData.variables.find(v => v.id === variableId);

      if (!variable || !formData) return false;

      return Object.entries(formData).some(([key, value]) => {
        const fieldMeta = variable.data[key];
        const variableFieldValue = fieldMeta?.value;

        const normalizedFormValue = value === '' ? undefined : value;
        const normalizedVariableValue = variableFieldValue === '' ? undefined : variableFieldValue;

        if (fieldMeta?.translatable && typeof value === 'object' && !Array.isArray(value)) {
          return JSON.stringify(value) !== JSON.stringify(variableFieldValue);
        }

        return JSON.stringify(normalizedFormValue) !== JSON.stringify(normalizedVariableValue);
      });
    });
  }, [variableFormData, globalData]);

  useEffect(() => {
    const hasAnyChanges = hasFormChanges || deletedVariableIds.size > 0;
    setHasChanges(hasAnyChanges);
    onHasChanges?.(hasAnyChanges);
  }, [hasFormChanges, deletedVariableIds.size, onHasChanges]);

  // Save function
  const handleSave = useCallback(async () => {
    if (saving || loading) return;

    setSaving(true);
    try {
      const updatedVariables = globalData.variables
        .filter(v => !deletedVariableIds.has(v.id))
        .map(variable => {
          const formData = variableFormData[variable.id];
          if (!formData) return variable;

          const updatedData = { ...variable.data };
          Object.entries(formData).forEach(([key, value]) => {
            if (updatedData[key]) {
              updatedData[key] = {
                ...updatedData[key],
                value: value === '' ? undefined : value
              };
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
  }, [globalData, variableFormData, deletedVariableIds, saving, loading, clearTranslationData]);

  // Expose save function via ref
  useEffect(() => {
    if (onSaveRef) {
      onSaveRef.current = { save: handleSave };
    }
  }, [onSaveRef, handleSave]);

  // Load global data and auto-initialize from schemas
  useEffect(() => {
    const loadGlobalVariables = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);

      try {
        const loadedData = await loadGlobals();
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
          existingVariable.schemaName = globalSchema.name;
          syncedVariables = [existingVariable];
        }

        const syncedData: GlobalData = { variables: syncedVariables };
        setGlobalData(syncedData);
        setVariableFormData({});
        setDeletedVariableIds(new Set());
        setHasChanges(false);
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
          existingVariable.schemaName = globalSchema.name;
          syncedVariables = [existingVariable];
        }

        setGlobalData({ variables: syncedVariables });
        setHasChanges(false);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    };

    loadGlobalVariables();
  }, [initialData, availableSchemas]);

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
          <div>
            <h3 className="font-semibold">Validation Errors</h3>
            <p className="text-sm mt-1">
              Please fix the validation errors in your form fields before saving.
            </p>
          </div>
        </Alert>
      )}

      {editState?.isOpen && (
        <RepeaterItemEditView />
      )}

      <div className={cn("space-y-8", editState?.isOpen && "hidden")}>
        {(() => {
          // Get the single global variable (should only be one with id "globals")
          const variable = globalData.variables.find(v => v.id === 'globals' && !deletedVariableIds.has(v.id));
          
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
              onDelete={() => handleDeleteVariable(variable.id)}
              onRename={handleRenameVariable}
              validationErrors={validationErrors[variable.id]}
              highlightedField={highlightedField}
            />
          );
        })()}
      </div>
    </div>
  );
};

export const GlobalVariablesManager = React.memo(GlobalVariablesManagerComponent);

