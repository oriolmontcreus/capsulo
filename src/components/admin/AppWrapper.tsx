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
import { CommitViewer } from './HistoryViewer';
import { SaveErrorDialog, type SaveError } from './SaveErrorDialog';

// Component to close repeater edit view when switching views
const ViewChangeHandler: React.FC<{ activeView: 'content' | 'globals' | 'changes' | 'history' }> = ({ activeView }) => {
  const { closeEdit } = useRepeaterEdit();
  const prevViewRef = React.useRef<'content' | 'globals' | 'changes' | 'history' | null>(null);

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
  const [selectedPage, setSelectedPage] = useState(availablePages[0]?.id || 'index');

  // Cache for page data - loaded lazily on demand
  const [pagesDataCache, setPagesDataCache] = React.useState<Record<string, PageData>>(pagesData);
  const loadingPagesRef = React.useRef<Set<string>>(new Set());
  const [loadingPages, setLoadingPages] = React.useState<Set<string>>(new Set());

  const [currentGlobalData, setCurrentGlobalData] = useState(globalData);

  // Initialize activeView from URL if available, otherwise default to 'pages'
  const getInitialView = (): 'content' | 'globals' | 'changes' | 'history' => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.includes('/admin/globals')) {
        return 'globals';
      } else if (pathname.includes('/admin/changes')) {
        return 'changes';
      } else if (pathname.includes('/admin/history')) {
        return 'history';
      } else if (pathname.includes('/admin/content')) {
        return 'content';
      }
    }
    return 'content';
  };

  const [activeView, setActiveView] = useState<'content' | 'globals' | 'changes' | 'history'>(getInitialView);
  const [commitMessage, setCommitMessage] = useState('');
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);

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
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const saveRef = React.useRef<{ save: () => Promise<void> }>({ save: async () => { } });
  const reorderRef = React.useRef<{ reorder: (pageId: string, newComponentIds: string[]) => void }>({ reorder: () => { } });

  // State for error dialog
  const [saveErrors, setSaveErrors] = useState<SaveError[]>([]);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [lastCommitTimestamp, setLastCommitTimestamp] = useState<number>(0);

  // Update URL when activeView changes (without page reload)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      let newPath = '/admin/content';
      if (activeView === 'globals') newPath = '/admin/globals';
      if (activeView === 'changes') newPath = '/admin/changes';
      if (activeView === 'history') newPath = '/admin/history';

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
        } else if (pathname.includes('/admin/history')) {
          setActiveView('history');
        } else if (pathname.includes('/admin/content')) {
          setActiveView('content');
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
        let newPath = '/admin/content';
        if (initialView === 'globals') newPath = '/admin/globals';
        if (initialView === 'changes') newPath = '/admin/changes';
        if (initialView === 'history') newPath = '/admin/history';
        window.history.replaceState({ view: initialView }, '', newPath);
      }
    }
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
    // Skip 'globals' - it uses globalData prop, not the page loading mechanism
    if (selectedPage === 'globals') return;

    if ((activeView === 'content' || activeView === 'changes') && selectedPage && !pagesDataCache[selectedPage] && !loadingPagesRef.current.has(selectedPage)) {
      // Load in background - don't block UI
      loadPageData(selectedPage).catch(console.error);
    }
  }, [activeView, selectedPage, pagesDataCache, loadPageData]);

  // Preload first page when switching to pages or changes view
  React.useEffect(() => {
    if ((activeView === 'content' || activeView === 'changes') && availablePages.length > 0) {
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
      const globalsVar = globalData.variables.find((v: any) => v.id === 'globals');
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

  const handlePageSelect = React.useCallback((pageId: string) => {
    setSelectedPage(pageId);
    // Pre-load the selected page if not already loaded
    // Skip 'globals' - it uses globalData prop, not the page loading mechanism
    if (pageId !== 'globals' && !pagesDataCache[pageId] && !loadingPagesRef.current.has(pageId)) {
      loadPageData(pageId).catch(console.error);
    }
  }, [pagesDataCache, loadPageData]);

  // Handler for when CMSManager updates page data
  const handlePageDataUpdate = React.useCallback((pageId: string, newPageData: PageData) => {
    setPagesDataCache(prev => ({
      ...prev,
      [pageId]: newPageData
    }));
  }, []);

  // Handler for when GlobalVariablesManager updates global data
  const handleGlobalDataUpdate = React.useCallback((newGlobalData: GlobalData) => {
    setCurrentGlobalData(newGlobalData);
  }, []);

  const handleComponentSelect = React.useCallback((pageId: string, componentId: string, shouldScroll: boolean = false) => {
    // Switch to the page if selecting a component from a different page
    if (pageId !== selectedPage) {
      setSelectedPage(pageId);
    }
    // Component selected - could be used for future features
  }, [selectedPage]);

  // Handler for reordering components within a page
  const handleComponentReorder = React.useCallback((pageId: string, newComponentIds: string[]) => {
    // Forward the reorder request to CMSManager via a ref
    if (reorderRef.current) {
      reorderRef.current.reorder(pageId, newComponentIds);
    }
  }, []);



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
                    isAutoSaving={isAutoSaving}
                    commitMessage={commitMessage}
                    onCommitMessageChange={setCommitMessage}
                    selectedCommit={selectedCommit}
                    onCommitSelect={setSelectedCommit}
                    onPublish={async () => {
                      // Import dynamically to avoid circular dependency issues
                      const { savePage, saveGlobals } = await import('@/lib/cms-storage-adapter');
                      const { getChangedPageIds, getPageDraft, getGlobalsDraft, clearAllDrafts } = await import('@/lib/cms-local-changes');

                      const message = commitMessage || 'Update via CMS';

                      // Track save operations with metadata
                      interface SaveOperation {
                        type: 'page' | 'globals';
                        id: string;
                        promise: Promise<void>;
                      }

                      const saveOperations: SaveOperation[] = [];


                      // Save all pages that have drafts in localStorage
                      const changedPageIds = getChangedPageIds();
                      const savedPagesData: Record<string, PageData> = {};

                      for (const pageId of changedPageIds) {
                        const pageDraft = getPageDraft(pageId);
                        if (pageDraft) {
                          savedPagesData[pageId] = pageDraft;
                          const fileName = pageId === 'home' ? 'index' : pageId;
                          saveOperations.push({
                            type: 'page',
                            id: pageId,
                            promise: savePage(fileName, pageDraft, message)
                          });
                        }
                      }

                      // Also save globals if there's a draft
                      const globalsDraft = getGlobalsDraft();
                      let savedGlobalData: GlobalData | null = null;

                      if (globalsDraft) {
                        savedGlobalData = { variables: globalsDraft.variables };
                        saveOperations.push({
                          type: 'globals',
                          id: 'globals',
                          promise: saveGlobals(globalsDraft, message)
                        });
                      }

                      // Use Promise.allSettled to handle partial failures
                      const results = await Promise.allSettled(saveOperations.map(op => op.promise));

                      // Separate successful and failed saves
                      const failures: Array<{ type: 'page' | 'globals'; id: string; error: string }> = [];
                      const successes: Array<{ type: 'page' | 'globals'; id: string }> = [];

                      results.forEach((result, index) => {
                        const operation = saveOperations[index];
                        if (result.status === 'fulfilled') {
                          successes.push({ type: operation.type, id: operation.id });
                        } else {
                          const errorMessage = result.reason instanceof Error
                            ? result.reason.message
                            : String(result.reason);
                          failures.push({
                            type: operation.type,
                            id: operation.id,
                            error: errorMessage
                          });
                          console.error(`Failed to save ${operation.type} "${operation.id}":`, result.reason);
                        }
                      });

                      // Handle results based on success/failure
                      if (failures.length === 0) {
                        // All saves succeeded

                        // Update local caches with the saved data so UI reflects the new state immediately
                        setPagesDataCache(prev => ({
                          ...prev,
                          ...savedPagesData
                        }));

                        if (savedGlobalData) {
                          setCurrentGlobalData(savedGlobalData);
                        }

                        clearAllDrafts();
                        setLastCommitTimestamp(Date.now()); // Trigger remote data refresh in ChangesManager
                        setCommitMessage('');
                        setHasUnsavedChanges(false);
                        setSaveErrors([]);

                        console.log('All changes committed successfully with message:', message);
                        console.log('Saved items:', successes);

                        alert('✓ Changes committed successfully to the draft branch!');
                      } else {
                        // Partial or complete failure - store errors and show dialog trigger
                        console.error('Some saves failed:', failures);
                        console.log('Successful saves:', successes);

                        setSaveErrors(failures);
                        setShowErrorDialog(true);

                        // Show brief alert about failure
                        if (failures.length === saveOperations.length) {
                          alert('❌ Failed to save changes. Click "View Errors" for details.');
                        } else {
                          alert(`⚠️ Partially saved: ${successes.length} succeeded, ${failures.length} failed.\nDrafts have NOT been cleared. Click "View Errors" for details.`);
                        }
                      }
                    }}
                  >
                    {activeView === 'content' ? (
                      <CMSManager
                        initialData={pagesDataCache}
                        availablePages={availablePages}
                        componentManifest={componentManifest}
                        selectedPage={selectedPage}
                        onPageChange={setSelectedPage}
                        onPageDataUpdate={handlePageDataUpdate}
                        onSaveRef={saveRef}
                        onHasChanges={setHasUnsavedChanges}
                        onSaveStatusChange={setIsAutoSaving}
                        onReorderRef={reorderRef}
                        githubOwner={githubOwner}
                        githubRepo={githubRepo}
                      />
                    ) : activeView === 'changes' ? (
                      <ChangesManager
                        pageId={selectedPage}
                        pageName={selectedPage === 'globals' ? 'Global Variables' : (availablePages.find(p => p.id === selectedPage)?.name || selectedPage)}
                        localData={selectedPage === 'globals' ? { components: currentGlobalData.variables } : (pagesDataCache[selectedPage] || { components: [] })}
                        lastCommitTimestamp={lastCommitTimestamp}
                      />
                    ) : activeView === 'history' ? (
                      <CommitViewer commitSha={selectedCommit} />
                    ) : (
                      <GlobalVariablesManager
                        initialData={globalData}
                        onGlobalDataUpdate={handleGlobalDataUpdate}
                        onSaveRef={saveRef}
                        onHasChanges={setHasUnsavedChanges}
                        onSaveStatusChange={setIsAutoSaving}
                        highlightedField={highlightedGlobalField}
                        onFormDataChange={setGlobalFormData}
                        githubOwner={githubOwner}
                        githubRepo={githubRepo}
                      />
                    )}
                  </AuthenticatedWrapper>

                  <SaveErrorDialog
                    errors={saveErrors}
                    open={showErrorDialog}
                    onOpenChange={setShowErrorDialog}
                  />
                </RepeaterEditProvider>
              </ValidationProvider>
            </TranslationDataProvider>
          </TranslationProvider>
        </AuthProvider>
      </PreferencesProvider>
    </PerformanceMonitor>
  );
}