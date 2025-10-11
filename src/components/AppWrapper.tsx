import React from 'react';
import AuthProvider from './AuthProvider';
import AuthenticatedWrapper from './AuthenticatedWrapper';

interface AppWrapperProps {
  children: React.ReactNode;
}

export default function AppWrapper({ children }: AppWrapperProps) {
  return (
    <AuthProvider>
      <AuthenticatedWrapper>
        {children}
      </AuthenticatedWrapper>
    </AuthProvider>
  );
}