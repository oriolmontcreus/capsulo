/**
 * AdminRoot - Root component for the Admin SPA
 *
 * This component wraps the entire admin application with necessary context providers
 * and renders the AdminRouter for client-side routing.
 *
 * Phase 4 of Admin SPA Refactor - Component Migration
 */

import { Toaster } from "sonner";
import { PreferencesProvider } from "@/lib/context/PreferencesContext";
import { RepeaterEditProvider } from "@/lib/form-builder/context/RepeaterEditContext";
import { TranslationProvider } from "@/lib/form-builder/context/TranslationContext";
import { TranslationDataProvider } from "@/lib/form-builder/context/TranslationDataContext";
import { ValidationProvider } from "@/lib/form-builder/context/ValidationContext";
import AuthProvider from "./AuthProvider";
import { PerformanceMonitor } from "./PerformanceMonitor";
import AdminRouter from "./router/AdminRouter";

interface AdminRootProps {
  /**
   * Base path for the router (e.g., "/admin" or "/admin/spa_test")
   */
  basename?: string;
}

/**
 * Root component for the Admin SPA.
 *
 * Provides all necessary context providers and renders the router.
 * This replaces the monolithic AppWrapper by separating concerns:
 * - Context providers are here in AdminRoot
 * - Routing is handled by AdminRouter
 * - Data fetching is handled by TanStack Query in individual pages
 * - UI layout is handled by AdminLayout
 */
export default function AdminRoot({ basename = "/admin" }: AdminRootProps) {
  return (
    <>
      <Toaster />
      <PerformanceMonitor>
        <PreferencesProvider>
          <AuthProvider>
            <TranslationProvider>
              <TranslationDataProvider>
                <ValidationProvider>
                  <RepeaterEditProvider>
                    <AdminRouter basename={basename} />
                  </RepeaterEditProvider>
                </ValidationProvider>
              </TranslationDataProvider>
            </TranslationProvider>
          </AuthProvider>
        </PreferencesProvider>
      </PerformanceMonitor>
    </>
  );
}
