import React, { useState } from 'react';
import AuthProvider from './AuthProvider';
import AuthenticatedWrapper from '@/components/admin/AuthenticatedWrapper';
import { CMSManager } from './CMSManager';
import { PerformanceMonitor } from './PerformanceMonitor';
import { TranslationProvider } from '@/lib/form-builder/context/TranslationContext';
import { TranslationDataProvider } from '@/lib/form-builder/context/TranslationDataContext';

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
  githubOwner?: string;
  githubRepo?: string;
}

export default function AppWrapper({
  availablePages = [],
  pagesData = {},
  githubOwner,
  githubRepo
}: AppWrapperProps) {
  const [selectedPage, setSelectedPage] = useState(availablePages[0]?.id || 'home');
  const [currentPagesData, setCurrentPagesData] = useState(pagesData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveRef = React.useRef<(() => Promise<void>) | null>(null);

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

  return (
    <PerformanceMonitor>
      <AuthProvider>
        <TranslationProvider>
          <TranslationDataProvider>
            <AuthenticatedWrapper
              availablePages={availablePages}
              pagesData={currentPagesData}
              selectedPage={selectedPage}
              onPageSelect={handlePageSelect}
              onComponentSelect={handleComponentSelect}
              onSaveRef={saveRef}
              hasUnsavedChanges={hasUnsavedChanges}
            >
              <CMSManager
                initialData={pagesData}
                availablePages={availablePages}
                selectedPage={selectedPage}
                onPageChange={setSelectedPage}
                onPageDataUpdate={handlePageDataUpdate}
                onSaveRef={saveRef}
                onHasChanges={setHasUnsavedChanges}
                githubOwner={githubOwner}
                githubRepo={githubRepo}
              />
            </AuthenticatedWrapper>
          </TranslationDataProvider>
        </TranslationProvider>
      </AuthProvider>
    </PerformanceMonitor>
  );
}