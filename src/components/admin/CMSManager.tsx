import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAllSchemas } from '@/lib/form-builder';
import type { ComponentData, PageData, Schema } from '@/lib/form-builder';
import { savePageToGitHub, hasDraftChanges, loadDraftData } from '@/lib/cms-storage';
import { setRepoInfo } from '@/lib/github-api';
import { DynamicForm } from './DynamicForm';
import { ComponentCard } from './ComponentCard';
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
}

export const CMSManager: React.FC<CMSManagerProps> = ({ initialData = {}, availablePages = [], githubOwner, githubRepo }) => {
  const [selectedPage, setSelectedPage] = useState(availablePages[0]?.id || 'home');
  const [pageData, setPageData] = useState<PageData>({ components: [] });
  const [availableSchemas] = useState<Schema[]>(getAllSchemas());
  const [editingComponent, setEditingComponent] = useState<{ id: string; schema: Schema } | null>(null);
  const [addingSchema, setAddingSchema] = useState<Schema | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (githubOwner && githubRepo) {
      setRepoInfo(githubOwner, githubRepo);
    }
  }, [githubOwner, githubRepo]);

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
            setPageData(draftData);
            setHasChanges(true);
            return;
          }
        }
        
        setPageData(collectionData);
        setHasChanges(false);
      } catch (error) {
        console.error('Failed to load page:', error);
        setPageData(initialData[selectedPage] || { components: [] });
        setHasChanges(false);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    };
    
    loadPage();
  }, [selectedPage, initialData]);

  const handleSaveComponent = async (formData: Record<string, any>) => {
    const componentData: Record<string, { type: any; value: any }> = {};
    const schema = addingSchema || availableSchemas.find(s => s.name === editingComponent?.schema.name);
    
    if (!schema) return;

    schema.fields.forEach(field => {
      componentData[field.name] = {
        type: field.type,
        value: formData[field.name] ?? '',
      };
    });

    let updated: PageData;
    if (editingComponent) {
      updated = {
        components: pageData.components.map(comp =>
          comp.id === editingComponent.id
            ? { ...comp, data: componentData }
            : comp
        )
      };
    } else if (addingSchema) {
      const newComponent: ComponentData = {
        id: `${addingSchema.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        schemaName: addingSchema.name,
        data: componentData,
      };
      updated = { components: [...pageData.components, newComponent] };
    } else {
      return;
    }

    setSaving(true);
    try {
      await savePageToGitHub(selectedPage, updated);
      setPageData(updated);
      setHasChanges(true);
      setEditingComponent(null);
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
      setPageData(updated);
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

  if (editingComponent) {
    const component = pageData.components.find(c => c.id === editingComponent.id);
    const initialFormData: Record<string, any> = {};
    
    if (component) {
      Object.entries(component.data).forEach(([key, value]) => {
        initialFormData[key] = value.value;
      });
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Edit Component</h2>
          <Button variant="outline" onClick={() => setEditingComponent(null)}>
            Back
          </Button>
        </div>
        <DynamicForm
          fields={editingComponent.schema.fields}
          initialData={initialFormData}
          onSave={handleSaveComponent}
          onCancel={() => setEditingComponent(null)}
        />
      </div>
    );
  }

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

      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select Page</label>
            <select
              value={selectedPage}
              onChange={(e) => setSelectedPage(e.target.value)}
              className="flex h-10 w-full md:w-64 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {availablePages.map(page => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
            </select>
          </div>

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
              <ComponentCard
                key={component.id}
                component={component}
                onEdit={() => setEditingComponent({ id: component.id, schema })}
                onDelete={() => handleDeleteComponent(component.id)}
              />
            ) : null;
          })
        )}
      </div>
    </div>
  );
};
