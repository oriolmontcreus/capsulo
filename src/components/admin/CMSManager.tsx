import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useFileUploadSaveIntegration } from '@/lib/form-builder/fields/FileUpload/useFileUploadIntegration';
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
  onSaveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  onHasChanges?: (hasChanges: boolean) => void;
}

export const CMSManager: React.FC<CMSManagerProps> = ({
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
  const loadingRef = useRef(false);

  // File upload integration
  const { processFormDataForSave, hasPendingFileOperations } = useFileUploadSaveIntegration();

  // Check if add component feature is enabled via configuration
  const isAddComponentEnabled = capsuloConfig.features.enableAddComponent;

  // Helper function to update page data and notify parent
  const updatePageData = useCallback((newPageData: PageData) => {
    setPageData(newPageData);
    onPageDataUpdate?.(selectedPage, newPageData);
  }, [selectedPage, onPageDataUpdate]);

  // Check for changes based on form data and deleted components
  useEffect(() => {
    const hasFormChanges = Object.keys(componentFormData).some(componentId => {
      const formData = componentFormData[componentId];
      const component = pageData.components.find(c => c.id === componentId);

      if (!component || !formData) return false;

      return Object.entries(formData).some(([key, value]) => {
        return component.data[key]?.value !== value;
      });
    });

    const hasDeletedComponents = deletedComponentIds.size > 0;

    setHasChanges(hasFormChanges || hasDeletedComponents);
  }, [componentFormData, pageData.components, deletedComponentIds]);

  // Notify parent about changes
  useEffect(() => {
    onHasChanges?.(hasChanges);
  }, [hasChanges, onHasChanges]);

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
          const value = formData[field.name] ?? component.data[field.name]?.value;
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
        // Flatten all form data for file processing, including FileUpload fields from existing data
        const flatFormData: Record<string, any> = {};

        // Add form data
        Object.values(componentFormData).forEach(formData => {
          Object.assign(flatFormData, formData);
        });

        // Also include existing FileUpload field values from component data
        pageData.components.forEach(component => {
          const schema = availableSchemas.find(s => s.name === component.schemaName);
          if (!schema) return;

          const dataFields = flattenFields(schema.fields);
          dataFields.forEach(field => {
            if (field.type === 'fileUpload') {
              const existingValue = component.data[field.name]?.value;
              // Only add if not already in form data
              if (!(field.name in flatFormData) && existingValue) {
                flatFormData[field.name] = existingValue;
              }
            }
          });
        });

        // Process file operations and get updated form data
        console.log('[File Upload] Processing pending file operations...');
        const updatedFlatFormData = await processFormDataForSave(flatFormData);
        console.log('[File Upload] File operations completed');

        // Update component form data with processed file URLs
        processedFormData = { ...componentFormData };
        Object.keys(updatedFlatFormData).forEach(fieldName => {
          // Find which component this field belongs to and update it
          Object.keys(processedFormData).forEach(componentId => {
            if (processedFormData[componentId] && fieldName in processedFormData[componentId]) {
              processedFormData[componentId] = {
                ...processedFormData[componentId],
                [fieldName]: updatedFlatFormData[fieldName]
              };
            }
          });
        });
      }

      // Build updated page data from processed form data, excluding deleted components
      const updatedComponents = pageData.components
        .filter(component => !deletedComponentIds.has(component.id))
        .map(component => {
          const schema = availableSchemas.find(s => s.name === component.schemaName);
          if (!schema) return component;

          const formData = processedFormData[component.id] || {};
          const componentDataUpdated: Record<string, { type: any; value: any }> = {};

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
                value: cleanFileUploadValue,
              };
            } else {
              componentDataUpdated[field.name] = {
                type: field.type,
                value: cleanValue(rawValue),
              };
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
    } catch (error: any) {
      console.error('[CMSManager] Save failed:', error);
      alert(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }, [pageData.components, availableSchemas, componentFormData, deletedComponentIds, selectedPage, updatePageData]);

  // Expose save function to parent
  useEffect(() => {
    if (onSaveRef) {
      onSaveRef.current = handleSaveAllComponents;
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
            setHasChanges(true);
            return;
          }
        }

        updatePageData(collectionData);
        setHasChanges(false);
      } catch (error) {
        console.error('Failed to load page:', error);
        updatePageData(initialData[selectedPage] || { components: [] });
        setHasChanges(false);
      } finally {
        // Clear form data and deleted components when loading a new page
        setComponentFormData({});
        setDeletedComponentIds(new Set());
        loadingRef.current = false;
        setLoading(false);
      }
    };

    loadPage();
  }, [selectedPage, initialData]);

  const handleComponentDataChange = useCallback((componentId: string, formData: Record<string, any>) => {
    setComponentFormData(prev => ({
      ...prev,
      [componentId]: formData
    }));
  }, []);



  const handleSaveComponent = async (formData: Record<string, any>) => {
    if (!addingSchema) return;

    setSaving(true);
    try {
      // Process any pending file operations first
      let processedFormData = formData;

      if (hasPendingFileOperations()) {
        console.log('[File Upload] Processing pending file operations...');
        processedFormData = await processFormDataForSave(formData);
        console.log('[File Upload] File operations completed');
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

      const componentData: Record<string, { type: any; value: any }> = {};

      // Only save data fields, not layouts
      const dataFields = flattenFields(addingSchema.fields);

      dataFields.forEach(field => {
        const rawValue = processedFormData[field.name];

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

          componentData[field.name] = {
            type: field.type,
            value: cleanFileUploadValue,
          };
        } else {
          componentData[field.name] = {
            type: field.type,
            value: cleanValue(rawValue),
          };
        }
      });

      const newComponent: ComponentData = {
        id: `${addingSchema.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        schemaName: addingSchema.name,
        data: componentData,
      };

      const updated = { components: [...pageData.components, newComponent] };

      await savePage(selectedPage, updated);
      updatePageData(updated);
      setHasChanges(true);
      setAddingSchema(null);
    } catch (error: any) {
      alert(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
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
        <h1 className="text-3xl font-bold">Capsulo CMS</h1>
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
                  key={component.id}
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
