import React from 'react';
import { useAuthContext } from '@/components/admin/AuthProvider';
import SidebarWrapper from '@/components/admin/SidebarWrapper';

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

interface AuthenticatedWrapperProps {
  children: React.ReactNode;
  availablePages?: PageInfo[];
  pagesData?: Record<string, PageData>;
  selectedPage?: string;
  onPageSelect?: (pageId: string) => void;
  onComponentSelect?: (pageId: string, componentId: string) => void;
}

export default function AuthenticatedWrapper({
  children,
  availablePages = [],
  pagesData = {},
  selectedPage,
  onPageSelect,
  onComponentSelect
}: AuthenticatedWrapperProps) {
  const { isAuthenticated, user, loading, logout } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
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
      selectedPage={selectedPage}
      onPageSelect={onPageSelect}
      onComponentSelect={onComponentSelect}
    >
      {children}
    </SidebarWrapper>
  );
}