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
import { setRepoInfo } from '@/lib/github-api';
import { capsuloConfig } from '@/lib/config';
import { DynamicForm } from './DynamicForm';
import { InlineComponentForm } from './InlineComponentForm';
import { PublishButton } from './PublishButton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { fieldToZod } from '@/lib/form-builder/fields/ZodRegistry';
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
  githubOwner?: string;
  githubRepo?: string;
  selectedPage?: string;
  onPageChange?: (pageId: string) => void;
  onPageDataUpdate?: (pageId: string, newPageData: PageData) => void;
  onSaveRef?: React.RefObject<{ save: () => Promise<void> }>;
  onHasChanges?: (hasChanges: boolean) => void;
}

const CMSManagerComponent: React.FC<CMSManagerProps> = ({
  initialData = {},
  availablePages = [],
  githubOwner,
  githubRepo,
  selectedPage: propSelectedPage,
  onPageChange,
  onPageDataUpdate,
  onSaveRef,
  onHasChanges
}) => {
  const [selectedPage, setSelectedPage] = useState(propSelectedPage || availablePages[0]?.id || 'home');
  const [pageData, setPageData] = useState<PageData>({ components: [] });
  const [availableSchemas] = useState<Schema[]>(getAllSchemas());
  const [addingSchema, setAddingSchema] = useState<Schema | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [componentFormData, setComponentFormData] = useState<Record<string, Record<string, any>>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, Record<string, string>>>({});
  const [deletedComponentIds, setDeletedComponentIds] = useState<Set<string>>(new Set());
  const [saveTimestamp, setSaveTimestamp] = useState<number>(Date.now()); // Force re-render after save
  const loadingRef = useRef(false);

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
  onPageDataUpdateRef.current = onPageDataUpdate;

  useEffect(() => {
    // Only update if the filtered data actually changed
    const prevData = prevFilteredDataRef.current;
    const currentData = filteredPageData;

    // Compare component IDs to detect additions, deletions, or reordering
    const prevIds = prevData.components.map(c => c.id).join(',');
    const currentIds = currentData.components.map(c => c.id).join(',');

    console.log('[CMSManager] Filtered data check:', {
      prevIds,
      currentIds,
      changed: prevIds !== currentIds,
      selectedPage
    });

    if (prevIds !== currentIds) {
      console.log('[CMSManager] Notifying parent of data change');
      prevFilteredDataRef.current = currentData;
      onPageDataUpdateRef.current?.(selectedPage, currentData);
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
    const hasChanges = Object.keys(componentFormData).some(componentId => {
      const formData = componentFormData[componentId];
      const component = pageData.components.find(c => c.id === componentId);

      if (!component || !formData) return false;

      return Object.entries(formData).some(([key, value]) => {
        const componentFieldValue = component.data[key]?.value;

        // Handle new translation format where value can be an object with locale keys
        if (componentFieldValue && typeof componentFieldValue === 'object' && !Array.isArray(componentFieldValue)) {
          // Compare with default locale value from translation object
          return componentFieldValue[defaultLocale] !== value;
        } else {
          // Handle simple value (backward compatibility)
          return componentFieldValue !== value;
        }
      });
    });

    return hasChanges;
  }, [componentFormData, pageData.components, defaultLocale]);

  // Optimized deleted components detection
  const hasDeletedComponents = useMemo(() => {
    return deletedComponentIds.size > 0;
  }, [deletedComponentIds]);

  // Final change detection - only runs when any of the boolean states change
  useEffect(() => {
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

    // Build updated page data from all component form data, excluding deleted components
    const updatedComponents = pageData.components
      .filter(component => !deletedComponentIds.has(component.id))
      .map(component => {
        const schema = availableSchemas.find(s => s.name === component.schemaName);
        if (!schema) return component;

        const formData = componentFormData[component.id] || {};
        const componentDataUpdated: Record<string, { type: any; translatable?: boolean; value: any }> = {};

        // Only save data fields, not layouts (layouts are just for CMS UI organization)
        const dataFields = flattenFields(schema.fields);

        dataFields.forEach(field => {
          const rawValue = formData[field.name] ?? component.data[field.name]?.value;

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
            };
          } else if (hasTranslations) {
            // Only default locale - store as simple value
            componentDataUpdated[field.name] = {
              type: field.type,
              translatable: (field as any).translatable || false,
              value: fieldTranslations[defaultLocale],
            };
          } else {
            // No value at all
            componentDataUpdated[field.name] = {
              type: field.type,
              translatable: (field as any).translatable || false,
              value: undefined,
            };
          }
        });

        return {
          ...component,
          data: componentDataUpdated
        };
      });

    const updated: PageData = { components: updatedComponents };

    setSaving(true);
    try {
      await savePage(selectedPage, updated);
      updatePageData(updated);
      setHasChanges(false); // Set to false since we just saved
      setComponentFormData({}); // Clear form data after save
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

  useEffect(() => {
    // Prevent multiple simultaneous loads
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);

    const loadPage = async () => {
      try {
        const collectionData = initialData[selectedPage] || { components: [] };

        const hasUnpublished = await hasUnpublishedChanges();
        if (hasUnpublished) {
          const draftData = await loadDraft(selectedPage);
          if (draftData) {
            updatePageData(draftData);
            loadTranslationDataFromComponents(draftData.components);
            setHasChanges(true);
            return;
          }
        }

        updatePageData(collectionData);
        loadTranslationDataFromComponents(collectionData.components);
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
        clearTranslationData(); // Clear translation data when loading a new page
        loadingRef.current = false;
        setLoading(false);
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



  const handleSaveComponent = (formData: Record<string, any>) => {
    if (!addingSchema) return;

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

    const componentData: Record<string, { type: any; translatable?: boolean; value: any }> = {};

    // Only save data fields, not layouts
    const dataFields = flattenFields(addingSchema.fields);

    dataFields.forEach(field => {
      componentData[field.name] = {
        type: field.type,
        translatable: (field as any).translatable || false,
        value: cleanValue(formData[field.name]),
      };
    });

    const newComponent: ComponentData = {
      id: `${addingSchema.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      schemaName: addingSchema.name,
      data: componentData,
    };

    const updated = { components: [...pageData.components, newComponent] };

    // Just update the page data without saving - the user will save manually
    updatePageData(updated);
    setHasChanges(true);
    setAddingSchema(null);
  };

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

  const handlePublished = () => {
    setHasChanges(false);
    window.location.reload();
  };



  if (addingSchema) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Add {addingSchema.name}</h2>
          <Button variant="outline" onClick={() => setAddingSchema(null)}>
            Back
          </Button>
        </div>
        <DynamicForm
          fields={addingSchema.fields}
          onSave={handleSaveComponent}
          onCancel={() => setAddingSchema(null)}
        />
      </div>
    );
  }

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
        <Card className="p-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Add Component</label>
              <div className="flex flex-wrap gap-2">
                {availableSchemas.map(schema => (
                  <Button
                    key={schema.name}
                    variant="outline"
                    onClick={() => setAddingSchema(schema)}
                  >
                    + {schema.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-8">


        {pageData.components.filter(c => !deletedComponentIds.has(c.id)).length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg text-muted-foreground/70">No components yet. Add your first component above!</p>
          </div>
        ) : (
          pageData.components
            .filter(component => !deletedComponentIds.has(component.id))
            .map(component => {
              const schema = availableSchemas.find(s => s.name === component.schemaName);

              return schema ? (
                <InlineComponentForm
                  key={`${component.id}-${saveTimestamp}-${isTranslationMode}`}
                  component={component}
                  fields={schema.fields}
                  onDataChange={handleComponentDataChange}
                  onDelete={() => handleDeleteComponent(component.id)}
                  validationErrors={validationErrors[component.id]}
                />
              ) : null;
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
    prevProps.onPageChange === nextProps.onPageChange &&
    prevProps.onPageDataUpdate === nextProps.onPageDataUpdate &&
    prevProps.onSaveRef === nextProps.onSaveRef &&
    prevProps.onHasChanges === nextProps.onHasChanges
  );
});
