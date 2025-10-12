import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAllSchemas } from '@/lib/form-builder';
import type { ComponentData, PageData, Schema } from '@/lib/form-builder';
import { savePageToGitHub, hasDraftChanges, loadDraftData } from '@/lib/cms-storage';
import { setRepoInfo } from '@/lib/github-api';
import { config } from '@/lib/config';
import { DynamicForm } from './DynamicForm';
import { InlineComponentForm } from './InlineComponentForm';
import { PublishButton } from './PublishButton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
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
  const loadingRef = useRef(false);

  // Check if add component feature is enabled via configuration
  const isAddComponentEnabled = config.features.enableAddComponent;

  // Helper function to update page data and notify parent
  const updatePageData = useCallback((newPageData: PageData) => {
    setPageData(newPageData);
    onPageDataUpdate?.(selectedPage, newPageData);
  }, [selectedPage, onPageDataUpdate]);

  // Check for changes based on form data
  useEffect(() => {
    const hasFormChanges = Object.keys(componentFormData).some(componentId => {
      const formData = componentFormData[componentId];
      const component = pageData.components.find(c => c.id === componentId);

      if (!component || !formData) return false;

      return Object.entries(formData).some(([key, value]) => {
        return component.data[key]?.value !== value;
      });
    });

    setHasChanges(hasFormChanges);
  }, [componentFormData, pageData.components]);

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
    const componentData: Record<string, { type: any; value: any }> = {};

    // Build updated page data from all component form data
    const updatedComponents = pageData.components.map(component => {
      const schema = availableSchemas.find(s => s.name === component.schemaName);
      if (!schema) return component;

      const formData = componentFormData[component.id] || {};
      const componentDataUpdated: Record<string, { type: any; value: any }> = {};

      schema.fields.forEach(field => {
        componentDataUpdated[field.name] = {
          type: field.type,
          value: formData[field.name] ?? component.data[field.name]?.value ?? '',
        };
      });

      return {
        ...component,
        data: componentDataUpdated
      };
    });

    const updated: PageData = { components: updatedComponents };

    setSaving(true);
    try {
      await savePageToGitHub(selectedPage, updated);
      updatePageData(updated);
      setHasChanges(true); // Keep as true since we saved to draft
      setComponentFormData({}); // Clear form data after save
    } catch (error: any) {
      alert(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }, [pageData.components, availableSchemas, componentFormData, selectedPage, updatePageData]);

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

        const hasDraft = await hasDraftChanges();
        if (hasDraft) {
          const draftData = await loadDraftData(selectedPage);
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

    const componentData: Record<string, { type: any; value: any }> = {};
    addingSchema.fields.forEach(field => {
      componentData[field.name] = {
        type: field.type,
        value: formData[field.name] ?? '',
      };
    });

    const newComponent: ComponentData = {
      id: `${addingSchema.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      schemaName: addingSchema.name,
      data: componentData,
    };

    const updated = { components: [...pageData.components, newComponent] };

    setSaving(true);
    try {
      await savePageToGitHub(selectedPage, updated);
      updatePageData(updated);
      setHasChanges(true);
      setAddingSchema(null);
    } catch (error: any) {
      alert(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteComponent = async (id: string) => {
    const updated = {
      components: pageData.components.filter(c => c.id !== id),
    };

    setSaving(true);
    try {
      await savePageToGitHub(selectedPage, updated);
      updatePageData(updated);
      setHasChanges(true);
    } catch (error: any) {
      alert(`Failed to delete: ${error.message}`);
    } finally {
      setSaving(false);
    }
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

      {hasChanges && (
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

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          Page Components ({pageData.components.length})
        </h2>
        {pageData.components.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <p>No components yet. Add your first component above!</p>
          </Card>
        ) : (
          pageData.components.map(component => {
            const schema = availableSchemas.find(s => s.name === component.schemaName);
            return schema ? (
              <InlineComponentForm
                key={component.id}
                component={component}
                fields={schema.fields}
                onDataChange={handleComponentDataChange}
                onDelete={() => handleDeleteComponent(component.id)}
              />
            ) : null;
          })
        )}
      </div>
    </div>
  );
};
