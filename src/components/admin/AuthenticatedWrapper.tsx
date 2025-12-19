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
  activeView?: 'pages' | 'globals';
  globalSearchQuery?: string;
  onGlobalSearchChange?: (query: string) => void;
  highlightedGlobalField?: string;
  onGlobalFieldHighlight?: (fieldKey: string) => void;
  globalFormData?: Record<string, any>;
  onPageSelect?: (pageId: string) => void;
  onComponentSelect?: (pageId: string, componentId: string, shouldScroll?: boolean) => void;
  onComponentReorder?: (pageId: string, newComponentIds: string[]) => void;
  onVariableSelect?: (variableId: string) => void;
  onViewChange?: (view: 'pages' | 'globals') => void;
  onGlobalDataUpdate?: (newGlobalData: GlobalData) => void;
  onSaveRef?: React.RefObject<{ save: () => Promise<void> }>;
  hasUnsavedChanges?: boolean;
  triggerSaveButtonRef?: React.RefObject<{ trigger: () => void }>;
}

export default function AuthenticatedWrapper({
  children,
  availablePages = [],
  pagesData = {},
  globalData = { variables: [] },
  selectedPage,
  selectedVariable,
  activeView = 'pages',
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
  onSaveRef,
  hasUnsavedChanges = false,
  triggerSaveButtonRef
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
      onSaveRef={onSaveRef}
      hasUnsavedChanges={hasUnsavedChanges}
      triggerSaveButtonRef={triggerSaveButtonRef}
    >
      {children}
    </SidebarWrapper>
  );
}