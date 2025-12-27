import React, { useState } from 'react';
import AuthProvider from './AuthProvider';
import AuthenticatedWrapper from '@/components/admin/AuthenticatedWrapper';
import { CMSManager } from './CMSManager';
import { GlobalVariablesManager } from './GlobalVariablesManager';
import { PerformanceMonitor } from './PerformanceMonitor';
import { TranslationProvider } from '@/lib/form-builder/context/TranslationContext';
import { TranslationDataProvider } from '@/lib/form-builder/context/TranslationDataContext';
import { RepeaterEditProvider, useRepeaterEdit } from '@/lib/form-builder/context/RepeaterEditContext';
import { ValidationProvider } from '@/lib/form-builder/context/ValidationContext';
import { PreferencesProvider } from '@/lib/context/PreferencesContext';
import type { GlobalData } from '@/lib/form-builder';
import { ChangesManager } from './ChangesViewer/ChangesManager';

// Component to close repeater edit view when switching views
const ViewChangeHandler: React.FC<{ activeView: 'pages' | 'globals' | 'changes' }> = ({ activeView }) => {
  const { closeEdit } = useRepeaterEdit();
  const prevViewRef = React.useRef<'pages' | 'globals' | 'changes' | null>(null);

  React.useEffect(() => {
    // Only close if we're actually switching views (not on initial mount)
    if (prevViewRef.current !== null && prevViewRef.current !== activeView) {
      closeEdit();
    }
    prevViewRef.current = activeView;
  }, [activeView, closeEdit]);

  return null;
};

export interface PageInfo {
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
  globalData?: GlobalData;
  componentManifest?: Record<string, Array<{ schemaKey: string; componentName: string; occurrenceCount: number }>>;
  githubOwner?: string;
  githubRepo?: string;
}

export default function AppWrapper({
  availablePages = [],
  globalData = { variables: [] },
  componentManifest,
  githubOwner,
  githubRepo
}: AppWrapperProps) {
  const [selectedPage, setSelectedPage] = useState(availablePages[0]?.id || 'index');

  // Cache for page data - loaded lazily on demand
  const [pagesDataCache, setPagesDataCache] = React.useState<Record<string, PageData>>({});
  const loadingPagesRef = React.useRef<Set<string>>(new Set());
  const [loadingPages, setLoadingPages] = React.useState<Set<string>>(new Set());

  const [currentGlobalData, setCurrentGlobalData] = useState(globalData);

  // Initialize activeView from URL if available, otherwise default to 'pages'
  const getInitialView = (): 'pages' | 'globals' | 'changes' => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.includes('/admin/globals')) {
        return 'globals';
      } else if (pathname.includes('/admin/changes')) {
        return 'changes';
      } else if (pathname.includes('/admin/pages')) {
        return 'pages';
      }
    }
    return 'pages';
  };

  const [activeView, setActiveView] = useState<'pages' | 'globals' | 'changes'>(getInitialView);
  const [commitMessage, setCommitMessage] = useState('');

  const [selectedVariable, setSelectedVariable] = useState<string | undefined>();
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  const [highlightedGlobalField, setHighlightedGlobalField] = useState<string | undefined>();
  const [globalFormData, setGlobalFormData] = useState<Record<string, any>>({});

  // Handler to force highlight update even if value is the same
  const handleGlobalFieldHighlight = React.useCallback((fieldKey: string) => {
    // Reset first to force re-render, then set the value in next tick
    setHighlightedGlobalField(undefined);
    setTimeout(() => {
      setHighlightedGlobalField(fieldKey);
    }, 0);
  }, []);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [remoteSyncStatus, setRemoteSyncStatus] = useState<'idle' | 'syncing' | 'newer-remote' | 'synced'>('idle');
  const saveRef = React.useRef<{ save: () => Promise<void> }>({ save: async () => { } });
  const triggerSaveButtonRef = React.useRef<{ trigger: () => void }>({ trigger: () => { } });
  const reorderRef = React.useRef<{ reorder: (pageId: string, newComponentIds: string[]) => void }>({ reorder: () => { } });

  // Update URL when activeView changes (without page reload)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      let newPath = '/admin/pages';
      if (activeView === 'globals') newPath = '/admin/globals';
      if (activeView === 'changes') newPath = '/admin/changes';

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
        } else if (pathname.includes('/admin/changes')) {
          setActiveView('changes');
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
        let newPath = '/admin/pages';
        if (initialView === 'globals') newPath = '/admin/globals';
        if (initialView === 'changes') newPath = '/admin/changes';
        window.history.replaceState({ view: initialView }, '', newPath);
      }
    }
  }, []);

  // Background sync: Check if draft branch has newer data from other users
  React.useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('github_access_token') : null;
    if (!token) return;

    const syncWithRemote = async () => {
      setRemoteSyncStatus('syncing');
      try {
        // Fetch the draft branch to see if it exists and has content
        const response = await fetch('/api/cms/changes?page=index&branch=draft', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const result = await response.json();
          // If draft branch exists with data, other users may have made changes
          if (result.data && result.branch) {
            // Check if we have any local drafts
            const { hasAnyDrafts } = await import('@/lib/cms-local-changes');
            if (!hasAnyDrafts()) {
              // No local changes but remote has data - might want to load it
              console.log('[CMS Sync] Remote draft branch has data. Consider refreshing to see latest changes.');
              setRemoteSyncStatus('newer-remote');
              return;
            }
          }
        }
        setRemoteSyncStatus('synced');
      } catch (error) {
        console.error('[CMS Sync] Failed to check remote draft branch:', error);
        setRemoteSyncStatus('synced'); // Don't block on sync errors
      }
    };

    // Run sync after a short delay to not block initial render
    const timeoutId = setTimeout(syncWithRemote, 1000);
    return () => clearTimeout(timeoutId);
  }, []);

  // Lazy load page data function with caching
  const loadPageData = React.useCallback(async (pageId: string): Promise<PageData | null> => {
    // Return cached data if available
    if (pagesDataCache[pageId]) {
      return pagesDataCache[pageId];
    }

    // Don't load if already loading - use ref for synchronous check
    if (loadingPagesRef.current.has(pageId)) {
      return null;
    }

    // Mark as loading synchronously via ref
    loadingPagesRef.current.add(pageId);
    setLoadingPages(prev => new Set(prev).add(pageId));

    try {
      // Map page.id to the actual file name (e.g., 'index' -> 'index', 'home' -> 'index')
      const fileName = pageId === "home" ? "index" : pageId;

      // Load from API endpoint (works in dev mode)
      const response = await fetch(`/api/cms/load?page=${encodeURIComponent(fileName)}`);

      if (!response.ok) {
        if (response.status === 404) {
          // Page data doesn't exist yet, use empty components array
          const emptyData: PageData = { components: [] };
          setPagesDataCache(prev => ({ ...prev, [pageId]: emptyData }));
          return emptyData;
        }
        throw new Error(`Failed to load page data: ${response.statusText}`);
      }

      const pageData: PageData = await response.json();

      // Cache the loaded data
      setPagesDataCache(prev => ({ ...prev, [pageId]: pageData }));

      return pageData;
    } catch (error) {
      console.error(`Error loading page data for ${pageId}:`, error);
      // Return empty data on error
      const emptyData: PageData = { components: [] };
      setPagesDataCache(prev => ({ ...prev, [pageId]: emptyData }));
      return emptyData;
    } finally {
      loadingPagesRef.current.delete(pageId);
      setLoadingPages(prev => {
        const next = new Set(prev);
        next.delete(pageId);
        return next;
      });
    }
  }, [pagesDataCache]);

  // Load page data when switching to pages or changes view or when a page is selected
  React.useEffect(() => {
    if ((activeView === 'pages' || activeView === 'changes') && selectedPage && !pagesDataCache[selectedPage] && !loadingPagesRef.current.has(selectedPage)) {
      // Load in background - don't block UI
      loadPageData(selectedPage).catch(console.error);
    }
  }, [activeView, selectedPage, pagesDataCache, loadPageData]);

  // Preload first page when switching to pages or changes view
  React.useEffect(() => {
    if ((activeView === 'pages' || activeView === 'changes') && availablePages.length > 0) {
      const firstPageId = availablePages[0].id;
      if (!pagesDataCache[firstPageId] && !loadingPagesRef.current.has(firstPageId)) {
        loadPageData(firstPageId).catch(console.error);
      }
    }
  }, [activeView, availablePages, pagesDataCache, loadPageData]);

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

  // Reset highlighted field when search query is cleared
  React.useEffect(() => {
    if (!globalSearchQuery) {
      setHighlightedGlobalField(undefined);
    }
  }, [globalSearchQuery]);

  // Reset highlighted field when save completes (hasUnsavedChanges goes from true to false)
  const prevHasUnsavedChangesRef = React.useRef(hasUnsavedChanges);
  React.useEffect(() => {
    // If we had unsaved changes and now we don't, it means we just saved
    if (prevHasUnsavedChangesRef.current && !hasUnsavedChanges) {
      setHighlightedGlobalField(undefined);
    }
    prevHasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  const handlePageSelect = (pageId: string) => {
    setSelectedPage(pageId);
    // Pre-load the selected page if not already loaded
    if (!pagesDataCache[pageId] && !loadingPagesRef.current.has(pageId)) {
      loadPageData(pageId).catch(console.error);
    }
  };

  // Handler for when CMSManager updates page data
  const handlePageDataUpdate = (pageId: string, newPageData: PageData) => {
    setPagesDataCache(prev => ({
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
              <ValidationProvider>
                <RepeaterEditProvider>
                  <ViewChangeHandler activeView={activeView} />
                  <AuthenticatedWrapper
                    availablePages={availablePages}
                    pagesData={pagesDataCache}
                    globalData={currentGlobalData}
                    selectedPage={selectedPage}
                    selectedVariable={selectedVariable}
                    activeView={activeView}
                    globalSearchQuery={globalSearchQuery}
                    onGlobalSearchChange={setGlobalSearchQuery}
                    highlightedGlobalField={highlightedGlobalField}
                    onGlobalFieldHighlight={handleGlobalFieldHighlight}
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
                    commitMessage={commitMessage}
                    onCommitMessageChange={setCommitMessage}
                    onPublish={async () => {
                      // Import dynamically to avoid circular dependency issues
                      const { savePage, saveGlobals } = await import('@/lib/cms-storage-adapter');
                      const { getChangedPageIds, getPageDraft, getGlobalsDraft, clearAllDrafts } = await import('@/lib/cms-local-changes');

                      const message = commitMessage || 'Update via CMS';

                      try {
                        const savePromises: Promise<void>[] = [];

                        // Save all pages that have drafts in localStorage
                        const changedPageIds = getChangedPageIds();
                        for (const pageId of changedPageIds) {
                          const pageDraft = getPageDraft(pageId);
                          if (pageDraft) {
                            const fileName = pageId === 'home' ? 'index' : pageId;
                            savePromises.push(savePage(fileName, pageDraft, message));
                          }
                        }

                        // Also save globals if there's a draft
                        const globalsDraft = getGlobalsDraft();
                        if (globalsDraft) {
                          savePromises.push(saveGlobals(globalsDraft, message));
                        }

                        await Promise.all(savePromises);

                        // Clear localStorage drafts after successful save
                        clearAllDrafts();

                        // Clear the commit message after successful save
                        setCommitMessage('');
                        setHasUnsavedChanges(false);

                        console.log('Changes committed successfully with message:', message);

                        // Show success feedback to user
                        alert('✓ Changes committed successfully to the draft branch!');
                      } catch (error) {
                        console.error('Failed to commit changes:', error);
                        alert(`Failed to save changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
                      }
                    }}
                  >
                    {activeView === 'pages' ? (
                      <CMSManager
                        initialData={pagesDataCache}
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
                    ) : activeView === 'changes' ? (
                      <ChangesManager
                        pageId={selectedPage}
                        pageName={selectedPage === 'globals' ? 'Global Variables' : (availablePages.find(p => p.id === selectedPage)?.name || selectedPage)}
                        localData={selectedPage === 'globals' ? { components: globalData.variables } : (pagesDataCache[selectedPage] || { components: [] })}
                      />
                    ) : (
                      <GlobalVariablesManager
                        initialData={globalData}
                        onGlobalDataUpdate={handleGlobalDataUpdate}
                        onSaveRef={saveRef}
                        onHasChanges={setHasUnsavedChanges}
                        highlightedField={highlightedGlobalField}
                        onFormDataChange={setGlobalFormData}
                        githubOwner={githubOwner}
                        githubRepo={githubRepo}
                      />
                    )}
                  </AuthenticatedWrapper>
                </RepeaterEditProvider>
              </ValidationProvider>
            </TranslationDataProvider>
          </TranslationProvider>
        </AuthProvider>
      </PreferencesProvider>
    </PerformanceMonitor>
  );
}