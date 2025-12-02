import React, { useState } from 'react';
import AuthProvider from './AuthProvider';
import AuthenticatedWrapper from '@/components/admin/AuthenticatedWrapper';
import { CMSManager } from './CMSManager';
import { GlobalVariablesManager } from './GlobalVariablesManager';
import { PerformanceMonitor } from './PerformanceMonitor';
import { TranslationProvider } from '@/lib/form-builder/context/TranslationContext';
import { TranslationDataProvider } from '@/lib/form-builder/context/TranslationDataContext';
import { RepeaterEditProvider } from '@/lib/form-builder/context/RepeaterEditContext';
import { PreferencesProvider } from '@/lib/context/PreferencesContext';
import type { GlobalData } from '@/lib/form-builder';

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
  globalData?: GlobalData;
  componentManifest?: Record<string, Array<{ schemaKey: string; componentName: string; occurrenceCount: number }>>;
  githubOwner?: string;
  githubRepo?: string;
}

export default function AppWrapper({
  availablePages = [],
  pagesData = {},
  globalData = { variables: [] },
  componentManifest,
  githubOwner,
  githubRepo
}: AppWrapperProps) {
  const [selectedPage, setSelectedPage] = useState(availablePages[0]?.id || 'home');
  const [currentPagesData, setCurrentPagesData] = useState(pagesData);
  const [currentGlobalData, setCurrentGlobalData] = useState(globalData);
  
  // Initialize activeView from URL if available, otherwise default to 'pages'
  const getInitialView = (): 'pages' | 'globals' => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.includes('/admin/globals')) {
        return 'globals';
      } else if (pathname.includes('/admin/pages')) {
        return 'pages';
      }
    }
    return 'pages';
  };
  
  const [activeView, setActiveView] = useState<'pages' | 'globals'>(getInitialView);
  const [selectedVariable, setSelectedVariable] = useState<string | undefined>();
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  const [highlightedGlobalField, setHighlightedGlobalField] = useState<string | undefined>();
  const [globalFormData, setGlobalFormData] = useState<Record<string, any>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveRef = React.useRef<{ save: () => Promise<void> }>({ save: async () => { } });
  const triggerSaveButtonRef = React.useRef<{ trigger: () => void }>({ trigger: () => { } });
  const reorderRef = React.useRef<{ reorder: (pageId: string, newComponentIds: string[]) => void }>({ reorder: () => { } });

  // Update URL when activeView changes (without page reload)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const newPath = activeView === 'globals' ? '/admin/globals' : '/admin/pages';
      // Only update if the path is different to avoid unnecessary history entries
      if (window.location.pathname !== newPath) {
        window.history.pushState({ view: activeView }, '', newPath);
      }
    }
  }, [activeView]);

  // Handle browser back/forward buttons
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const handlePopState = (event: PopStateEvent) => {
        const pathname = window.location.pathname;
        if (pathname.includes('/admin/globals')) {
          setActiveView('globals');
        } else if (pathname.includes('/admin/pages')) {
          setActiveView('pages');
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  // Initialize URL on mount if it's just /admin
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname === '/admin' || pathname === '/admin/') {
        const initialView = getInitialView();
        const newPath = initialView === 'globals' ? '/admin/globals' : '/admin/pages';
        window.history.replaceState({ view: initialView }, '', newPath);
      }
    }
  }, []);

  // Update current pages data when initial data changes
  React.useEffect(() => {
    setCurrentPagesData(pagesData);
  }, [pagesData]);

  // Update current global data when initial data changes
  React.useEffect(() => {
    setCurrentGlobalData(globalData);
    // Auto-select the global variable if switching to globals view and it exists
    if (activeView === 'globals' && !selectedVariable && globalData.variables.length > 0) {
      const globalsVar = globalData.variables.find(v => v.id === 'globals');
      if (globalsVar) {
        setSelectedVariable('globals');
      }
    }
  }, [globalData, activeView, selectedVariable]);

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

  // Handler for when GlobalVariablesManager updates global data
  const handleGlobalDataUpdate = (newGlobalData: GlobalData) => {
    setCurrentGlobalData(newGlobalData);
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
              <RepeaterEditProvider>
                <AuthenticatedWrapper
                availablePages={availablePages}
                pagesData={currentPagesData}
                globalData={currentGlobalData}
                selectedPage={selectedPage}
                selectedVariable={selectedVariable}
                activeView={activeView}
                globalSearchQuery={globalSearchQuery}
                onGlobalSearchChange={setGlobalSearchQuery}
                highlightedGlobalField={highlightedGlobalField}
                onGlobalFieldHighlight={setHighlightedGlobalField}
                globalFormData={globalFormData}
                onPageSelect={handlePageSelect}
                onComponentSelect={handleComponentSelect}
                onComponentReorder={handleComponentReorder}
                onVariableSelect={setSelectedVariable}
                onViewChange={setActiveView}
                onGlobalDataUpdate={handleGlobalDataUpdate}
                onSaveRef={saveRef}
                hasUnsavedChanges={hasUnsavedChanges}
                triggerSaveButtonRef={triggerSaveButtonRef}
              >
                {activeView === 'pages' ? (
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
                ) : (
                  <GlobalVariablesManager
                    initialData={globalData}
                    selectedVariable={selectedVariable}
                    onVariableChange={setSelectedVariable}
                    onGlobalDataUpdate={handleGlobalDataUpdate}
                    onSaveRef={saveRef}
                    onHasChanges={setHasUnsavedChanges}
                    searchQuery={globalSearchQuery}
                    highlightedField={highlightedGlobalField}
                    onFormDataChange={setGlobalFormData}
                    githubOwner={githubOwner}
                    githubRepo={githubRepo}
                  />
                )}
              </AuthenticatedWrapper>
              </RepeaterEditProvider>
            </TranslationDataProvider>
          </TranslationProvider>
        </AuthProvider>
      </PreferencesProvider>
    </PerformanceMonitor>
  );
}