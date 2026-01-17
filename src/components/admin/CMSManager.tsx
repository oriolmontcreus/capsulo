import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getAllSchemas } from '@/lib/form-builder';
import type { ComponentData, PageData, Schema } from '@/lib/form-builder';
import { flattenFields } from '@/lib/form-builder/core/fieldHelpers';
import {
  savePage,
  hasUnpublishedChanges,
  loadDraft
} from '@/lib/cms-storage-adapter';
import { savePageDraft, getPageDraft } from '@/lib/cms-local-changes';
import { cn } from '@/lib/utils';
import { InlineComponentForm } from './InlineComponentForm';
import { fieldToZod } from '@/lib/form-builder/fields/ZodRegistry';
import { useFileUploadSaveIntegration } from '@/lib/form-builder/fields/FileUpload/useFileUploadIntegration';
import { useTranslationData } from '@/lib/form-builder/context/TranslationDataContext';
import { useTranslation } from '@/lib/form-builder/context/TranslationContext';
import { useRepeaterEdit } from '@/lib/form-builder/context/RepeaterEditContext';
import { useValidationOptional, type ValidationError } from '@/lib/form-builder/context/ValidationContext';
import { RepeaterItemEditView } from '@/lib/form-builder/fields/Repeater/variants/RepeaterItemEditView';
import { useDebouncedValueWithStatus } from '@/lib/hooks/useDebouncedCallback';
import config from '@/capsulo.config';
import '@/lib/form-builder/schemas';
import { generateItemId } from '@/lib/utils/id-generation';

/**
 * Synchronizes components with the manifest by adding any missing components.
 * This ensures components declared in the manifest but not yet in the data are created.
 */
const syncManifestComponents = (
  components: ComponentData[],
  manifestComponents: Array<{ schemaKey: string; occurrenceCount: number }>,
  schemas: Schema[]
): ComponentData[] => {
  const synced = [...components];
  const existingIds = new Set(synced.map(c => c.id));
  const schemaByKey = new Map(
    schemas.filter(s => typeof s.key === 'string' && s.key.length > 0).map(s => [s.key as string, s])
  );

  manifestComponents.forEach(({ schemaKey, occurrenceCount }) => {
    const schema = schemaByKey.get(schemaKey);
    if (!schema) return;

    const existingForSchemaCount = synced.filter(c => c.schemaName === schema.name).length;
    const missingCount = Math.max(0, occurrenceCount - existingForSchemaCount);
    for (let i = 0; i < missingCount; i++) {
      const baseId = `${schemaKey}-${existingForSchemaCount + i}`;
      let id = baseId;
      let suffix = 0;
      while (existingIds.has(id)) id = `${baseId}-${++suffix}`;
      synced.push({ id, schemaName: schema.name, data: {} });
      existingIds.add(id);
    }
  });

  return synced;
};

// Shared hooks
import {
  useFormChangeDetection,
  useTranslationChangeDetection,
  useTranslationMerge,
  useSaveStatusReporting,
  normalizeValue
} from '@/lib/hooks/content-manager';

// Shared UI components
import { DraftChangesAlert, ValidationErrorsAlert } from './shared';

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
  /** Called after autosave completes to revalidate drafts */
  onRevalidate?: () => void;
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
  onHasChanges,
  onSaveStatusChange,
  onRevalidate
}) => {
  const [selectedPage, setSelectedPage] = useState(propSelectedPage || availablePages[0]?.id || 'home');
  const [pageData, setPageData] = useState<PageData>({ components: [] });
  const [availableSchemas] = useState<Schema[]>(getAllSchemas());
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [componentFormData, setComponentFormData] = useState<Record<string, Record<string, any>>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, Record<string, string>>>({});

  // Debounced componentFormData for change detection
  const [debouncedComponentFormData, isDebouncing] = useDebouncedValueWithStatus(componentFormData, config.ui.autoSaveDebounceMs);

  // Validation context (optional)
  const validationContext = useValidationOptional();

  // File upload integration
  const { processFormDataForSave, hasPendingFileOperations, queueRichEditorImageDeletions } = useFileUploadSaveIntegration();

  // Get translation data
  const { translationData, clearTranslationData, setTranslationValue } = useTranslationData();
  const { defaultLocale, availableLocales, isTranslationMode, closeTranslationSidebar } = useTranslation();
  const { editState, closeEdit } = useRepeaterEdit();

  // Debounced translationData
  const [debouncedTranslationData, isTranslationDebouncing] = useDebouncedValueWithStatus(translationData, config.ui.autoSaveDebounceMs);

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Key to force re-mount of InlineComponentForm after AI updates
  const [aiReloadKey, setAiReloadKey] = useState(0);

  // Helper function to update page data
  const updatePageData = useCallback((newPageData: PageData) => {
    setPageData(newPageData);
  }, []);

  // Use ref to track and notify parent when page data changes
  const prevPageDataRef = useRef<PageData>({ components: [] });
  const onPageDataUpdateRef = useRef(onPageDataUpdate);
  onPageDataUpdateRef.current = onPageDataUpdate;

  useEffect(() => {
    if (isInitialLoad) {
      prevPageDataRef.current = { components: [] };
    }
    const prevData = prevPageDataRef.current;
    const currentData = pageData;
    const prevIds = prevData.components.map(c => `${c.id}:${c.alias || ''}`).join(',');
    const currentIds = currentData.components.map(c => `${c.id}:${c.alias || ''}`).join(',');
    if (prevIds !== currentIds) {
      if (!isInitialLoad || prevIds !== '') {
        onPageDataUpdateRef.current?.(selectedPage, currentData);
      }
      prevPageDataRef.current = currentData;
    }
  }, [pageData, selectedPage, isInitialLoad]);

  // Use shared hooks for change detection
  const hasFormChanges = useFormChangeDetection({
    debouncedFormData: debouncedComponentFormData,
    entities: pageData.components,
    config: { defaultLocale }
  });

  const hasTranslationChanges = useTranslationChangeDetection({
    translationData,
    defaultLocale
  });

  // Final change detection
  useEffect(() => {
    if (isInitialLoad && !hasFormChanges && !hasTranslationChanges) {
      return;
    }
    const totalChanges = hasFormChanges || hasTranslationChanges;
    setHasChanges(totalChanges);
  }, [hasFormChanges, hasTranslationChanges, isInitialLoad]);

  // Notify parent about changes
  useEffect(() => {
    onHasChanges?.(hasChanges);
  }, [hasChanges, onHasChanges]);

  // Use shared hook for save status reporting
  useSaveStatusReporting({
    isFormDebouncing: isDebouncing,
    isTranslationDebouncing,
    onSaveStatusChange
  });

  // Draft persistence - custom implementation due to page-specific save logic
  useEffect(() => {
    if (!hasChanges || isInitialLoad) return;

    const mergedComponents = pageData.components.map(component => {
      const formData = debouncedComponentFormData[component.id];
      const schema = availableSchemas.find(s => s.name === component.schemaName);
      if (!schema) return component;

      const mergedData: Record<string, { type: any; translatable?: boolean; value: any }> = { ...component.data };
      const flatFields = flattenFields(schema.fields);

      // Merge form data
      if (formData) {
        Object.entries(formData).forEach(([fieldName, value]) => {
          const existingField = component.data[fieldName];
          const fieldDef = flatFields.find(f => f.name === fieldName);
          const correctType = fieldDef?.type || existingField?.type || 'unknown';

          if (existingField) {
            if (existingField.translatable && typeof existingField.value === 'object' && !Array.isArray(existingField.value)) {
              mergedData[fieldName] = {
                ...existingField,
                type: correctType,
                value: { ...existingField.value, [defaultLocale]: value }
              };
            } else {
              mergedData[fieldName] = { ...existingField, type: correctType, value };
            }
          } else {
            mergedData[fieldName] = { type: correctType, value };
          }
        });
      }

      // Merge translation data
      Object.entries(debouncedTranslationData).forEach(([locale, localeData]) => {
        if (locale === defaultLocale) return;
        const componentTranslations = localeData[component.id];
        if (!componentTranslations) return;

        Object.entries(componentTranslations).forEach(([fieldName, value]) => {
          const existingField = mergedData[fieldName] || component.data[fieldName];
          if (existingField) {
            const fieldDef = flatFields.find(f => f.name === fieldName);
            const correctType = fieldDef?.type || existingField.type || 'unknown';
            const currentValue = mergedData[fieldName]?.value ?? existingField.value;
            const isTranslationObject = currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue);

            if (isTranslationObject) {
              mergedData[fieldName] = {
                ...existingField,
                translatable: true,
                type: correctType,
                value: { ...currentValue, [locale]: value }
              };
            } else {
              mergedData[fieldName] = {
                ...existingField,
                translatable: true,
                type: correctType,
                value: { [defaultLocale]: currentValue, [locale]: value }
              };
            }
          }
        });
      });

      return { ...component, data: mergedData };
    });

    savePageDraft(selectedPage, { components: mergedComponents });
    onRevalidate?.();
    window.dispatchEvent(new CustomEvent('cms-changes-updated'));
  }, [hasChanges, isInitialLoad, pageData.components, debouncedComponentFormData, debouncedTranslationData, selectedPage, availableSchemas, defaultLocale, onRevalidate]);

  // Use shared hook for translation merge (display)
  const displayComponents = useTranslationMerge({
    entities: pageData.components,
    debouncedTranslationData,
    config: {
      schemas: availableSchemas,
      defaultLocale,
      availableLocales
    }
  });

  // Function to load translation data from existing component data
  const loadTranslationDataFromComponents = useCallback((components: ComponentData[]) => {
    components.forEach(component => {
      Object.entries(component.data).forEach(([fieldName, fieldData]) => {
        if (fieldData.value && typeof fieldData.value === 'object' && !Array.isArray(fieldData.value)) {
          Object.entries(fieldData.value).forEach(([locale, value]) => {
            if (availableLocales.includes(locale) && locale !== defaultLocale && value !== undefined && value !== '') {
              setTranslationValue(fieldName, locale, value, component.id);
            }
          });
        }
      });
    });
  }, [setTranslationValue, defaultLocale, availableLocales]);

  // Handle external page selection
  useEffect(() => {
    if (propSelectedPage && propSelectedPage !== selectedPage) {
      setSelectedPage(propSelectedPage);
      closeTranslationSidebar();
    }
  }, [propSelectedPage, selectedPage, closeTranslationSidebar]);

  // Notify parent when page changes
  useEffect(() => {
    onPageChange?.(selectedPage);
  }, [selectedPage, onPageChange]);

  const handleSaveAllComponents = useCallback(async () => {
    // Validation
    const errors: Record<string, Record<string, string>> = {};
    const errorDetailsList: ValidationError[] = [];
    let hasAnyErrors = false;

    pageData.components.forEach(component => {
      const schema = availableSchemas.find(s => s.name === component.schemaName);
      if (!schema) return;

      const formData = componentFormData[component.id] || {};
      const componentErrors: Record<string, string> = {};
      const dataFields = flattenFields(schema.fields);

      dataFields.forEach(field => {
        const zodSchema = fieldToZod(field, formData);
        let value = formData[field.name];

        if (value === undefined) {
          const componentFieldValue = component.data[field.name]?.value;
          if (componentFieldValue && typeof componentFieldValue === 'object' && !Array.isArray(componentFieldValue)) {
            value = componentFieldValue[defaultLocale];
          } else {
            value = componentFieldValue;
          }
        }

        const result = zodSchema.safeParse(value);

        if (!result.success) {
          result.error.errors.forEach(issue => {
            const pathParts = [field.name, ...issue.path];
            const path = pathParts.join('.');
            componentErrors[path] = issue.message;

            const fieldLabel = 'label' in field && field.label ? String(field.label) : field.name;
            errorDetailsList.push({
              componentId: component.id,
              componentName: component.alias || component.schemaName,
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

      if (Object.keys(componentErrors).length > 0) {
        errors[component.id] = componentErrors;
      }
    });

    if (hasAnyErrors) {
      setValidationErrors(errors);
      if (validationContext) {
        validationContext.setValidationErrors(errors, errorDetailsList);
      }
      throw new Error('Validation failed. Please fix the errors before saving.');
    }

    setValidationErrors({});
    if (validationContext) {
      validationContext.clearValidationErrors();
    }


    setSaving(true);
    try {
      queueRichEditorImageDeletions(pageData.components, componentFormData);

      let processedFormData = componentFormData;

      if (hasPendingFileOperations()) {
        const nestedFormData: Record<string, Record<string, any>> = {};
        Object.entries(componentFormData).forEach(([componentId, formData]) => {
          nestedFormData[componentId] = { ...formData };
        });

        pageData.components.forEach(component => {
          const schema = availableSchemas.find(s => s.name === component.schemaName);
          if (!schema) return;
          if (!nestedFormData[component.id]) nestedFormData[component.id] = {};

          const dataFields = flattenFields(schema.fields);
          dataFields.forEach(field => {
            if (field.type === 'fileUpload') {
              const existingValue = component.data[field.name]?.value;
              if (!(field.name in nestedFormData[component.id]) && existingValue) {
                nestedFormData[component.id][field.name] = existingValue;
              }
            }
          });
        });

        processedFormData = await processFormDataForSave(nestedFormData);
      }

      const updatedComponents = pageData.components.map(component => {
        const schema = availableSchemas.find(s => s.name === component.schemaName);
        if (!schema) return component;

        const formData = processedFormData[component.id] || {};
        const componentDataUpdated: Record<string, { type: any; translatable?: boolean; value: any }> = {};
        const dataFields = flattenFields(schema.fields);

        dataFields.forEach(field => {
          const rawValue = formData[field.name] ?? component.data[field.name]?.value;

          if (field.type === 'fileUpload') {
            let fileUploadValue = rawValue;
            if (!fileUploadValue || typeof fileUploadValue !== 'object' || !Array.isArray(fileUploadValue.files)) {
              fileUploadValue = { files: [] };
            }
            componentDataUpdated[field.name] = {
              type: field.type,
              translatable: (field as any).translatable || false,
              value: { files: fileUploadValue.files },
            };
          } else if (field.type === 'repeater') {
            const existingValue = component.data[field.name]?.value;
            const isTranslatable = (field as any).translatable ||
              (existingValue && typeof existingValue === 'object' && !Array.isArray(existingValue) && defaultLocale in existingValue);

            if (!isTranslatable) {
              let items = Array.isArray(rawValue) ? rawValue : [];
              items = items.map((item: any) => {
                if (item && typeof item === 'object' && !item._id) {
                  return { ...item, _id: generateItemId() };
                }
                return item;
              });
              componentDataUpdated[field.name] = { type: field.type, translatable: false, value: items };
            } else {
              let repeaterValue: Record<string, any> = {};
              if (existingValue && typeof existingValue === 'object' && !Array.isArray(existingValue)) {
                repeaterValue = { ...existingValue };
              }

              if (Array.isArray(rawValue)) {
                const cleaned = normalizeValue(rawValue);
                repeaterValue[defaultLocale] = Array.isArray(cleaned) ? cleaned : [];
              } else if (rawValue && typeof rawValue === 'object') {
                repeaterValue = { ...repeaterValue, ...rawValue };
              }

              Object.entries(translationData).forEach(([locale, localeData]) => {
                if (locale !== defaultLocale) {
                  const componentTranslations = localeData[component.id];
                  if (!componentTranslations || componentTranslations[field.name] === undefined) return;
                  const newTranslationValue = componentTranslations[field.name];
                  if (Array.isArray(newTranslationValue) && Array.isArray(repeaterValue[locale])) {
                    const merged = [...repeaterValue[locale]];
                    if (newTranslationValue.length > merged.length) merged.length = newTranslationValue.length;
                    newTranslationValue.forEach((item: any, index: number) => {
                      if (item !== undefined && item !== null) {
                        if (merged[index] && typeof merged[index] === 'object' && typeof item === 'object') {
                          merged[index] = { ...merged[index], ...item };
                        } else {
                          merged[index] = item;
                        }
                      }
                    });
                    repeaterValue[locale] = merged;
                  } else {
                    repeaterValue[locale] = newTranslationValue;
                  }
                }
              });

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

              componentDataUpdated[field.name] = { type: field.type, translatable: true, value: repeaterValue };
            }
          } else {
            // Handle translations for other field types
            const fieldTranslations: Record<string, any> = {};
            let hasTranslations = false;

            const existingFieldValue = component.data[field.name]?.value;
            const isTranslationMap = existingFieldValue &&
              typeof existingFieldValue === 'object' &&
              !Array.isArray(existingFieldValue) &&
              Object.keys(existingFieldValue).length > 0 &&
              Object.keys(existingFieldValue).every(key => availableLocales.includes(key));

            if (isTranslationMap) {
              Object.entries(existingFieldValue).forEach(([locale, value]) => {
                fieldTranslations[locale] = value;
                hasTranslations = true;
              });
            }

            const cleanedValue = normalizeValue(rawValue);
            if (cleanedValue !== undefined) {
              fieldTranslations[defaultLocale] = cleanedValue;
              hasTranslations = true;
            }

            Object.entries(translationData).forEach(([locale, localeData]) => {
              if (locale === defaultLocale) return;
              const componentTranslations = localeData[component.id];
              if (!componentTranslations) return;
              if (componentTranslations[field.name] !== undefined) {
                let translationValue = componentTranslations[field.name];
                if (translationValue === null) translationValue = '';
                fieldTranslations[locale] = translationValue;
                hasTranslations = true;
              }
            });

            const isFieldTranslatable = (field as any).translatable || false;

            if (hasTranslations && Object.keys(fieldTranslations).length > 1) {
              componentDataUpdated[field.name] = {
                type: field.type,
                translatable: isFieldTranslatable,
                value: fieldTranslations,
                ...(field.type === 'select' && (field as any).internalLinks && (field as any).autoResolveLocale ? { _internalLink: true } : {})
              };
            } else if (hasTranslations && isFieldTranslatable) {
              componentDataUpdated[field.name] = {
                type: field.type,
                translatable: true,
                value: fieldTranslations,
                ...(field.type === 'select' && (field as any).internalLinks && (field as any).autoResolveLocale ? { _internalLink: true } : {})
              };
            } else if (hasTranslations) {
              componentDataUpdated[field.name] = {
                type: field.type,
                translatable: false,
                value: fieldTranslations[defaultLocale],
                ...(field.type === 'select' && (field as any).internalLinks && (field as any).autoResolveLocale ? { _internalLink: true } : {})
              };
            } else {
              componentDataUpdated[field.name] = {
                type: field.type,
                translatable: isFieldTranslatable,
                value: undefined,
                ...(field.type === 'select' && (field as any).internalLinks && (field as any).autoResolveLocale ? { _internalLink: true } : {})
              };
            }
          }
        });

        return { ...component, data: componentDataUpdated };
      });

      const updated: PageData = { components: updatedComponents };
      await savePage(selectedPage, updated);
      updatePageData(updated);
      setHasChanges(false);

      // Update form data with saved values
      const updatedFormData: Record<string, Record<string, any>> = {};
      updated.components.forEach(component => {
        const schema = availableSchemas.find(s => s.name === component.schemaName);
        if (!schema) return;

        const dataFields = flattenFields(schema.fields);
        const componentFormDataNew: Record<string, any> = {};

        dataFields.forEach(field => {
          const fieldData = component.data[field.name];
          const fieldValue = fieldData?.value;
          const isTranslatable = fieldData?.translatable === true;

          if (isTranslatable && fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue) && defaultLocale in fieldValue) {
            componentFormDataNew[field.name] = fieldValue[defaultLocale];
          } else {
            componentFormDataNew[field.name] = fieldValue;
          }
        });

        updatedFormData[component.id] = componentFormDataNew;
      });

      setComponentFormData(updatedFormData);
      setValidationErrors({});
      clearTranslationData();
    } catch (error: any) {
      console.error('[CMSManager] Save failed:', error);
      alert(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }, [pageData.components, availableSchemas, componentFormData, selectedPage, updatePageData, translationData, defaultLocale, availableLocales, clearTranslationData, queueRichEditorImageDeletions, processFormDataForSave, hasPendingFileOperations, validationContext]);

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
        if (pageId !== selectedPage) return;
        setPageData(prevData => {
          const componentMap = new Map(prevData.components.map(comp => [comp.id, comp]));
          const reorderedComponents = newComponentIds
            .map(id => componentMap.get(id))
            .filter((comp): comp is ComponentData => comp !== undefined);
          return { ...prevData, components: reorderedComponents };
        });
        setHasChanges(true);
      };
    }
  }, [onReorderRef, selectedPage]);

  // Load page data
  useEffect(() => {
    let isActive = true;
    setIsReady(false);
    setIsInitialLoad(true);
    closeEdit();
    
    // Clear any pending AI reload when switching pages to avoid stale reloads
    setAiUpdatePendingReload(false);

    const loadPage = async () => {
      clearTranslationData();

      try {
        // Check IndexedDB for local drafts first
        const localDraft = await getPageDraft(selectedPage);
        if (localDraft) {
          console.log('[CMSManager] Loading from IndexedDB draft for page:', selectedPage);

          const manifestComponents = componentManifest?.[selectedPage] || [];
          const draftSyncedComponents = syncManifestComponents(
            localDraft.components,
            manifestComponents,
            availableSchemas
          );

          if (!isActive) return;
          updatePageData({ components: draftSyncedComponents });
          loadTranslationDataFromComponents(draftSyncedComponents);
          setHasChanges(true);
          return;
        }

        // Use cached/initial data from props
        const cachedPageData = initialData[selectedPage];

        if (cachedPageData) {
          const manifestComponents = componentManifest?.[selectedPage] || [];
          const syncedComponents = syncManifestComponents(
            cachedPageData.components,
            manifestComponents,
            availableSchemas
          );

          const syncedData = { components: syncedComponents };
          const hasUnpublished = await hasUnpublishedChanges();

          if (!isActive) return;

          if (hasUnpublished) {
            const draftData = await loadDraft(selectedPage);

            if (draftData && isActive) {
              const draftSyncedComponents = syncManifestComponents(
                draftData.components,
                manifestComponents,
                availableSchemas
              );

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
          setComponentFormData({});
          setIsReady(true);
          setIsInitialLoad(false);
        }
      }
    };

    loadPage();

    return () => {
      isActive = false;
    };
  }, [selectedPage, initialData, clearTranslationData, closeEdit, componentManifest, availableSchemas, loadTranslationDataFromComponents, updatePageData]);

  const handleComponentDataChange = useCallback((componentId: string, formData: Record<string, any>) => {
    setComponentFormData(prev => ({ ...prev, [componentId]: formData }));
  }, []);

  // Track if an AI update is pending reload after autosave
  const [aiUpdatePendingReload, setAiUpdatePendingReload] = useState(false);

  // AI Agent Integration: Listen for external component updates
  useEffect(() => {
    const handleAIUpdate = (event: CustomEvent<{ componentId: string; data: any }>) => {
      const { componentId, data } = event.detail;
      console.log('[CMSManager] Received AI update for component:', componentId);
      
      // We need to merge with existing data to be safe, or direct replace?
      // Direct replace of the form data for that component seems correct for an "Edit" action.
      // But we should ensure we don't lose other fields if the AI sends partial data?
      // valid JSON from AI should probably be the whole component data or we need to merge.
      // Let's assume AI sends the fields it wants to change.
      
      setComponentFormData(prev => {
        const existing = prev[componentId] || {};
        // Merge strategy: Overwrite keys present in the AI data
        return {
          ...prev,
          [componentId]: { ...existing, ...data }
        };
      });
      setHasChanges(true); // Flag as having changes so "View Changes" works
      
      // Mark that we need to reload after autosave completes
      setAiUpdatePendingReload(true);
    };

    window.addEventListener('cms-ai-update-component', handleAIUpdate as EventListener);
    return () => {
      window.removeEventListener('cms-ai-update-component', handleAIUpdate as EventListener);
    };
  }, []);

  // Reload page data from draft after AI update autosave completes
  // This reloads data EXACTLY as when initially opening a page (see loadPage at line ~607)
  useEffect(() => {
    // Only trigger when debouncing has finished and we have a pending AI reload
    if (isDebouncing || !aiUpdatePendingReload) {
      return;
    }
    
    // Capture the current page to ensure we reload for the correct page
    const targetPage = selectedPage;
    let isActive = true;
    
    // Reset the flag before async operation
    setAiUpdatePendingReload(false);
    
    console.log('[CMSManager] AI update autosave complete, reloading page data from draft');
    
    // Load the page data from draft (same approach as initial page load)
    const reloadFromDraft = async () => {
      try {
        const localDraft = await getPageDraft(targetPage);
        if (localDraft && isActive) {
          console.log('[CMSManager] Loaded draft data after AI update for page:', targetPage);
          
          const manifestComponents = componentManifest?.[targetPage] || [];
          const draftSyncedComponents = syncManifestComponents(
            localDraft.components,
            manifestComponents,
            availableSchemas
          );

          if (!isActive) return;
          
          // Clear existing translation data before loading new data to prevent stale entries
          clearTranslationData();
          
          updatePageData({ components: draftSyncedComponents });
          loadTranslationDataFromComponents(draftSyncedComponents);
          setHasChanges(true);
          
          // Reset form data so it picks up data from pageData.components again
          setComponentFormData({});
          
          // Increment reload key to force InlineComponentForm remount
          // This ensures the form re-initializes with the new component data
          setAiReloadKey(prev => prev + 1);
        }
      } catch (error) {
        if (!isActive) return;
        console.error('[CMSManager] Failed to reload page data after AI update:', error);
      }
    };
    
    reloadFromDraft();
    
    return () => {
      isActive = false;
    };
  }, [isDebouncing, aiUpdatePendingReload, selectedPage, componentManifest, availableSchemas, updatePageData, loadTranslationDataFromComponents, clearTranslationData]);

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
      <DraftChangesAlert hasChanges={hasChanges} onPublished={handlePublished} />
      <ValidationErrorsAlert validationErrors={validationErrors} validationContext={validationContext} />

      {editState?.isOpen && (
        <RepeaterItemEditView
          externalErrors={editState?.componentData?.id ? validationErrors[editState.componentData.id] : undefined}
        />
      )}

      <div className={cn("space-y-8 transition-opacity duration-200", editState?.isOpen && "hidden", isReady ? "opacity-100" : "opacity-0")}>
        {displayComponents.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg text-muted-foreground/70">
              No components detected in this page. Import components from @/components/capsulo/ in your .astro file to manage them here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {displayComponents.map(component => {
              const schema = availableSchemas.find(s => s.name === component.schemaName);

              return (
                schema && (
                  <InlineComponentForm
                    key={`${component.id}-${isTranslationMode}-${aiReloadKey}`}
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
      </div>
    </div>
  );
};

export const CMSManager = React.memo(CMSManagerComponent);
