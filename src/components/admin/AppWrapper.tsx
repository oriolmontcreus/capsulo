import React, { useState } from 'react';
import AuthProvider from './AuthProvider';
import AuthenticatedWrapper from '@/components/admin/AuthenticatedWrapper';
import { CMSManager } from './CMSManager';

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

  const handlePageSelect = (pageId: string) => {
    setSelectedPage(pageId);
  };

  const handleComponentSelect = (pageId: string, componentId: string) => {
    // Switch to the page if selecting a component from a different page
    if (pageId !== selectedPage) {
      setSelectedPage(pageId);
    }
    // You could add logic here to scroll to or highlight the component
    console.log(`Selected component ${componentId} from page ${pageId}`);
  };

  return (
    <AuthProvider>
      <AuthenticatedWrapper
        availablePages={availablePages}
        pagesData={pagesData}
        selectedPage={selectedPage}
        onPageSelect={handlePageSelect}
        onComponentSelect={handleComponentSelect}
      >
        <CMSManager
          initialData={pagesData}
          availablePages={availablePages}
          selectedPage={selectedPage}
          onPageChange={setSelectedPage}
          githubOwner={githubOwner}
          githubRepo={githubRepo}
        />
      </AuthenticatedWrapper>
    </AuthProvider>
  );
}