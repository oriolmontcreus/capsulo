import React, { useState } from 'react';
import AuthProvider from './AuthProvider';
import AuthenticatedWrapper from '@/components/admin/AuthenticatedWrapper';
import { CMSManager } from './CMSManager';
import { PerformanceMonitor } from './PerformanceMonitor';
import { TranslationProvider } from '@/lib/form-builder/context/TranslationContext';
import { TranslationDataProvider } from '@/lib/form-builder/context/TranslationDataContext';
import { PreferencesProvider } from '@/lib/context/PreferencesContext';

interface PageInfo {
  id: string;
  name: string;
  path: string;
}

interface ComponentData {
  id: string;
  schemaName: string;
  data: Record<string, { type: any; value: any }>;
}

interface PageData {
  components: ComponentData[];
}

interface AppWrapperProps {
  availablePages?: PageInfo[];
  pagesData?: Record<string, PageData>;
  componentManifest?: Record<string, Array<{ schemaKey: string; componentName: string; occurrenceCount: number }>>;
  githubOwner?: string;
  githubRepo?: string;
}

export default function AppWrapper({
  availablePages = [],
  pagesData = {},
  componentManifest,
  githubOwner,
  githubRepo
}: AppWrapperProps) {
  const [selectedPage, setSelectedPage] = useState(availablePages[0]?.id || 'home');
  const [currentPagesData, setCurrentPagesData] = useState(pagesData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveRef = React.useRef<{ save: () => Promise<void> }>({ save: async () => { } });
  const triggerSaveButtonRef = React.useRef<{ trigger: () => void }>({ trigger: () => { } });
  const reorderRef = React.useRef<{ reorder: (pageId: string, newComponentIds: string[]) => void }>({ reorder: () => { } });

  // Update current pages data when initial data changes
  React.useEffect(() => {
    setCurrentPagesData(pagesData);
  }, [pagesData]);

  const handlePageSelect = (pageId: string) => {
    setSelectedPage(pageId);
  };

  // Handler for when CMSManager updates page data
  const handlePageDataUpdate = (pageId: string, newPageData: PageData) => {
    setCurrentPagesData(prev => ({
      ...prev,
      [pageId]: newPageData
    }));
  };

  const handleComponentSelect = (pageId: string, componentId: string, shouldScroll: boolean = false) => {
    // Switch to the page if selecting a component from a different page
    if (pageId !== selectedPage) {
      setSelectedPage(pageId);
    }
    // Component selected - could be used for future features
  };

  // Handler for reordering components within a page
  const handleComponentReorder = (pageId: string, newComponentIds: string[]) => {
    // Forward the reorder request to CMSManager via a ref
    if (reorderRef.current) {
      reorderRef.current.reorder(pageId, newComponentIds);
    }
  };

  // Ctrl+S keyboard shortcut to save
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges && triggerSaveButtonRef.current) {
          triggerSaveButtonRef.current.trigger();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges]);

  return (
    <PerformanceMonitor>
      <PreferencesProvider>
        <AuthProvider>
          <TranslationProvider>
            <TranslationDataProvider>
              <AuthenticatedWrapper
                availablePages={availablePages}
                pagesData={currentPagesData}
                selectedPage={selectedPage}
                onPageSelect={handlePageSelect}
                onComponentSelect={handleComponentSelect}
                onComponentReorder={handleComponentReorder}
                onSaveRef={saveRef}
                hasUnsavedChanges={hasUnsavedChanges}
                triggerSaveButtonRef={triggerSaveButtonRef}
              >
                <CMSManager
                  initialData={pagesData}
                  availablePages={availablePages}
                  componentManifest={componentManifest}
                  selectedPage={selectedPage}
                  onPageChange={setSelectedPage}
                  onPageDataUpdate={handlePageDataUpdate}
                  onSaveRef={saveRef}
                  onHasChanges={setHasUnsavedChanges}
                  onReorderRef={reorderRef}
                  githubOwner={githubOwner}
                  githubRepo={githubRepo}
                />
              </AuthenticatedWrapper>
            </TranslationDataProvider>
          </TranslationProvider>
        </AuthProvider>
      </PreferencesProvider>
    </PerformanceMonitor>
  );
}