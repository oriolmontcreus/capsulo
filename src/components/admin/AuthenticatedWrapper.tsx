import React from 'react';
import { useAuthContext } from '@/components/admin/AuthProvider';
import SidebarWrapper from '@/components/admin/SidebarWrapper';
import { Spinner } from '@/components/ui/spinner';

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

interface GlobalData {
  variables: ComponentData[];
}

interface AuthenticatedWrapperProps {
  children: React.ReactNode;
  availablePages?: PageInfo[];
  pagesData?: Record<string, PageData>;
  globalData?: GlobalData;
  selectedPage?: string;
  selectedVariable?: string;
  activeView?: 'content' | 'globals' | 'changes' | 'history';
  commitMessage?: string;
  onCommitMessageChange?: (msg: string) => void;
  onPublish?: () => void;
  globalSearchQuery?: string;
  onGlobalSearchChange?: (query: string) => void;
  highlightedGlobalField?: string;
  onGlobalFieldHighlight?: (fieldKey: string) => void;
  globalFormData?: Record<string, any>;
  onPageSelect?: (pageId: string) => void;
  onComponentSelect?: (pageId: string, componentId: string, shouldScroll?: boolean) => void;
  onComponentReorder?: (pageId: string, newComponentIds: string[]) => void;
  onVariableSelect?: (variableId: string) => void;
  onViewChange?: (view: 'content' | 'globals' | 'changes' | 'history') => void;
  onGlobalDataUpdate?: (newGlobalData: GlobalData) => void;
  isAutoSaving?: boolean;
  selectedCommit?: string | null;
  onCommitSelect?: (sha: string) => void;
}

export default function AuthenticatedWrapper({
  children,
  availablePages = [],
  pagesData = {},
  globalData = { variables: [] },
  selectedPage,
  selectedVariable,
  activeView = 'content',
  commitMessage,
  onCommitMessageChange,
  onPublish,
  globalSearchQuery,
  onGlobalSearchChange,
  highlightedGlobalField,
  onGlobalFieldHighlight,
  globalFormData,
  onPageSelect,
  onComponentSelect,
  onComponentReorder,
  onVariableSelect,
  onViewChange,
  onGlobalDataUpdate,
  isAutoSaving = false,
  selectedCommit,
  onCommitSelect
}: AuthenticatedWrapperProps) {
  const { isAuthenticated, user, loading, logout } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Spinner className="mx-auto size-6 text-muted-foreground" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarWrapper
      availablePages={availablePages}
      pagesData={pagesData}
      globalData={globalData}
      selectedPage={selectedPage}
      selectedVariable={selectedVariable}
      activeView={activeView}
      commitMessage={commitMessage}
      onCommitMessageChange={onCommitMessageChange}
      onPublish={onPublish}
      globalSearchQuery={globalSearchQuery}
      onGlobalSearchChange={onGlobalSearchChange}
      highlightedGlobalField={highlightedGlobalField}
      onGlobalFieldHighlight={onGlobalFieldHighlight}
      globalFormData={globalFormData}
      onPageSelect={onPageSelect}
      onComponentSelect={onComponentSelect}
      onComponentReorder={onComponentReorder}
      onVariableSelect={onVariableSelect}
      onViewChange={onViewChange}
      onGlobalDataUpdate={onGlobalDataUpdate}
      isAutoSaving={isAutoSaving}
      selectedCommit={selectedCommit}
      onCommitSelect={onCommitSelect}
    >
      {children}
    </SidebarWrapper>
  );
}