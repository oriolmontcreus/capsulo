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
import { capsuloConfig } from '@/lib/config';
import { setRepoInfo } from '@/lib/github-api';
import { InlineComponentForm } from './InlineComponentForm';
import { PublishButton } from './PublishButton';
import { Alert } from '@/components/ui/alert';
import { fieldToZod } from '@/lib/form-builder/fields/ZodRegistry';
import { useFileUploadSaveIntegration } from '@/lib/form-builder/fields/FileUpload/useFileUploadIntegration';
import { Card } from '@/components/ui/card';
import { ComponentPicker } from './ComponentPicker';
import { useTranslationData } from '@/lib/form-builder/context/TranslationDataContext';
import { useTranslation } from '@/lib/form-builder/context/TranslationContext';
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
}

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
  onHasChanges
}) => {
  const [selectedPage, setSelectedPage] = useState(propSelectedPage || availablePages[0]?.id || 'home');
  const [pageData, setPageData] = useState<PageData>({ components: [] });
  const [availableSchemas] = useState<Schema[]>(getAllSchemas());
    const [addingSchema, setAddingSchema] = useState<Schema | null>(null);
  const [insertAfterComponentId, setInsertAfterComponentId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [componentFormData, setComponentFormData] = useState<Record<string, Record<string, any>>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, Record<string, string>>>({});
  const [deletedComponentIds, setDeletedComponentIds] = useState<Set<string>>(new Set());
  const [saveTimestamp, setSaveTimestamp] = useState<number>(Date.now()); // Force re-render after save
  const loadingRef = useRef(false);

  // File upload integration
  const { processFormDataForSave, hasPendingFileOperations } = useFileUploadSaveIntegration();

  // Get translation data to track translation changes
  const { translationData, clearTranslationData, setTranslationValue } = useTranslationData();
  const { defaultLocale, availableLocales, isTranslationMode } = useTranslation();

  // Check if add component feature is enabled via configuration
  const isAddComponentEnabled = capsuloConfig.features.enableAddComponent;

  // Compute filtered page data (excluding deleted components)
  const filteredPageData = useMemo<PageData>(() => ({
    components: pageData.components.filter(c => !deletedComponentIds.has(c.id))
  }), [pageData.components, deletedComponentIds]);

  // Helper function to update page data
  const updatePageData = useCallback((newPageData: PageData) => {
    setPageData(newPageData);
    // Don't call onPageDataUpdate here - let the effect handle it
    // This prevents duplicate updates and ensures filtered data is used
  }, []);

  // Use ref to track and notify parent when filtered page data changes
  const prevFilteredDataRef = useRef<PageData>({ components: [] });
  const onPageDataUpdateRef = useRef(onPageDataUpdate);
  const isInitialLoadRef = useRef(true);
  onPageDataUpdateRef.current = onPageDataUpdate;

  useEffect(() => {
    // Reset prevFilteredDataRef on initial load to prevent stale data from previous page
    if (isInitialLoadRef.current) {
      prevFilteredDataRef.current = { components: [] };
    }

    // Only update if the filtered data actually changed
    const prevData = prevFilteredDataRef.current;
    const currentData = filteredPageData;

    // Compare component IDs and aliases to detect additions, deletions, reordering, or renames
    const prevIds = prevData.components.map(c => `${c.id}:${c.alias || ''}`).join(',');
    const currentIds = currentData.components.map(c => `${c.id}:${c.alias || ''}`).join(',');

    if (prevIds !== currentIds) {
      // Skip notifying parent on initial load (when prevIds is empty)
      if (!isInitialLoadRef.current || prevIds !== '') {
        onPageDataUpdateRef.current?.(selectedPage, currentData);
      }
      // Only update prevFilteredDataRef after the gate check
      prevFilteredDataRef.current = currentData;
    }
  }, [filteredPageData, selectedPage]);

  // Simple translation change detection
  const hasTranslationChanges = useMemo(() => {
    return Object.entries(translationData).some(([locale, localeData]) => {
      if (locale === defaultLocale) return false;
      // Any translation data (including empty values) should be considered a change
      return Object.keys(localeData).length > 0;
    });
  }, [translationData, defaultLocale]);

  // Optimized form change detection
  const hasFormChanges = useMemo(() => {
    const changedComponents: Record<string, any> = {};

    const hasChanges = Object.keys(componentFormData).some(componentId => {
      const formData = componentFormData[componentId];
      const component = pageData.components.find(c => c.id === componentId);

      if (!component || !formData) return false;

      const changedFields: Record<string, any> = {};
      const hasComponentChanges = Object.entries(formData).some(([key, value]) => {
        const fieldMeta = component.data[key];
        const componentFieldValue = fieldMeta?.value;

        // Normalize values: treat empty string and undefined as equivalent
        const normalizedFormValue = value === '' ? undefined : value;
        const normalizedComponentValue = componentFieldValue === '' ? undefined : componentFieldValue;

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
          const normalizedLocaleValue = localeValue === '' ? undefined : localeValue;
          isDifferent = normalizedLocaleValue !== normalizedFormValue;
        } else {
          // Handle simple value or non-translatable structured objects
          // For structured objects (like fileUpload), use JSON comparison
          if (normalizedComponentValue && typeof normalizedComponentValue === 'object' &&
            normalizedFormValue && typeof normalizedFormValue === 'object') {
            isDifferent = JSON.stringify(normalizedComponentValue) !== JSON.stringify(normalizedFormValue);
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
  }, [componentFormData, pageData.components, defaultLocale]);

  // Optimized deleted components detection
  const hasDeletedComponents = useMemo(() => {
    return deletedComponentIds.size > 0;
  }, [deletedComponentIds]);

  // Final change detection - only runs when any of the boolean states change
  useEffect(() => {
    // Skip change detection during initial load
    if (isInitialLoadRef.current && !hasFormChanges && !hasDeletedComponents && !hasTranslationChanges) {
      return;
    }

    const totalChanges = hasFormChanges || hasDeletedComponents || hasTranslationChanges;
    setHasChanges(totalChanges);
  }, [hasFormChanges, hasDeletedComponents, hasTranslationChanges]);

  // Notify parent about changes
  useEffect(() => {
    onHasChanges?.(hasChanges);
  }, [hasChanges, onHasChanges]);

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

  useEffect(() => {
    if (githubOwner && githubRepo) {
      setRepoInfo(githubOwner, githubRepo);
    }
  }, [githubOwner, githubRepo]);

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
    let hasAnyErrors = false;

    pageData.components
      .filter(component => !deletedComponentIds.has(component.id))
      .forEach(component => {
        const schema = availableSchemas.find(s => s.name === component.schemaName);
        if (!schema) return;

        const formData = componentFormData[component.id] || {};
        const componentErrors: Record<string, string> = {};

        // Only validate data fields, not layouts
        const dataFields = flattenFields(schema.fields);

        dataFields.forEach(field => {
          const zodSchema = fieldToZod(field);
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
            const errorMessage = result.error.errors[0]?.message || 'Invalid value';
            componentErrors[field.name] = errorMessage;
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
      throw new Error('Validation failed. Please fix the errors before saving.');
    }

    // Clear any previous errors
    setValidationErrors({});

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
      // First, process any pending file operations
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

      // Build updated page data from processed form data, excluding deleted components
      const updatedComponents = pageData.components
        .filter(component => !deletedComponentIds.has(component.id))
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
            } else {
              // Handle translations for other field types
              // Check if we have translations for this field
              const fieldTranslations: Record<string, any> = {};
              let hasTranslations = false;

              // First, preserve existing translations from component data (but they can be overridden later)
              const existingFieldValue = component.data[field.name]?.value;
              if (existingFieldValue && typeof existingFieldValue === 'object' && !Array.isArray(existingFieldValue)) {
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
              if (hasTranslations && Object.keys(fieldTranslations).length > 1) {
                // Multiple locales - store as object
                componentDataUpdated[field.name] = {
                  type: field.type,
                  translatable: (field as any).translatable || false,
                  value: fieldTranslations,
                  ...(field.type === 'select' && (field as any).internalLinks && (field as any).autoResolveLocale ? { _internalLink: true } : {})
                };
              } else if (hasTranslations) {
                // Only default locale - store as simple value
                componentDataUpdated[field.name] = {
                  type: field.type,
                  translatable: (field as any).translatable || false,
                  value: fieldTranslations[defaultLocale],
                  ...(field.type === 'select' && (field as any).internalLinks && (field as any).autoResolveLocale ? { _internalLink: true } : {})
                };
              } else {
                // No value at all
                componentDataUpdated[field.name] = {
                  type: field.type,
                  translatable: (field as any).translatable || false,
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
          componentFormData[field.name] = component.data[field.name]?.value;
        });

        updatedFormData[component.id] = componentFormData;
      });

      setComponentFormData(updatedFormData);
      setDeletedComponentIds(new Set()); // Clear deleted components after save
      setValidationErrors({}); // Clear validation errors after successful save
      clearTranslationData(); // Clear translation data after save
      setSaveTimestamp(Date.now()); // Force component re-render to update translation icons
    } catch (error: any) {
      console.error('[CMSManager] Save failed:', error);
      alert(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }, [pageData.components, availableSchemas, componentFormData, deletedComponentIds, selectedPage, updatePageData, translationData, defaultLocale, clearTranslationData]);

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
    // Prevent multiple simultaneous loads
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    isInitialLoadRef.current = true; // Reset initial load flag when switching pages

    const loadPage = async () => {
      clearTranslationData();

      try {
        const collectionData = initialData[selectedPage] || { components: [] };

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
        if (hasUnpublished) {
          const draftData = await loadDraft(selectedPage);
          if (draftData) {
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
      } catch (error) {
        console.error('Failed to load page:', error);
        const fallbackData = initialData[selectedPage] || { components: [] };
        updatePageData(fallbackData);
        loadTranslationDataFromComponents(fallbackData.components);
        setHasChanges(false);
      } finally {
        // Clear form data and deleted components when loading a new page
        setComponentFormData({});
        setDeletedComponentIds(new Set());
        loadingRef.current = false;
        setLoading(false);
        // Mark initial load as complete after all state is cleared
        setTimeout(() => {
          isInitialLoadRef.current = false;
        }, 0);
      }
    };

    loadPage();
  }, [selectedPage, initialData, clearTranslationData]);

  const handleComponentDataChange = useCallback((componentId: string, formData: Record<string, any>) => {
    setComponentFormData(prev => ({
      ...prev,
      [componentId]: formData
    }));
  }, []);



  const handleDeleteComponent = (id: string) => {
    // Mark component for deletion instead of immediately deleting
    setDeletedComponentIds(prev => new Set(prev).add(id));
    // Remove any form data for this component
    setComponentFormData(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">TESTUI</h1>
      </div>

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

      {isAddComponentEnabled && (
        <Card className="p-0 m-0 w-fit rounded-md">
          <ComponentPicker
            onSelectComponent={(schema) => setAddingSchema(schema)}
          />
        </Card>
      )}

      <div className="space-y-8">


        {pageData.components.filter(c => !deletedComponentIds.has(c.id)).length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg text-muted-foreground/70">No components detected in this page. Import components from @/components/capsulo/ in your .astro file to manage them here.</p>
          </div>
        ) : (
          pageData.components
            .filter(component => !deletedComponentIds.has(component.id))
            .map(component => {
              const schema = availableSchemas.find(s => s.name === component.schemaName);

              return (
                schema && (
                  <InlineComponentForm
                    key={`${component.id}-${saveTimestamp}-${isTranslationMode}`}
                    component={component}
                    schema={schema}
                    fields={schema.fields}
                    onDataChange={handleComponentDataChange}
                    onDelete={() => handleDeleteComponent(component.id)}
                    onRename={handleRenameComponent}
                    validationErrors={validationErrors[component.id]}
                  />
                )
              );
            })
        )}
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
