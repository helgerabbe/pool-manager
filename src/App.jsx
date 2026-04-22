import React from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { RoleProvider } from '@/lib/RoleContext';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/lib/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import EinheitenListe from '@/pages/EinheitenListe';
import Benutzerverwaltung from '@/pages/Benutzerverwaltung';
import MoodleExport from '@/pages/MoodleExport';
import Workspace from '@/pages/Workspace';
import AdminSettings from '@/pages/AdminSettings';
import EinheitCreateWizard from '@/pages/EinheitCreateWizard';
import ExportCenter from '@/pages/ExportCenter';
import EinheitViewManager from '@/components/workspace/EinheitViewManager';
import BasismoduleOverview from '@/pages/BasismoduleOverview';
import BasismoduleView from '@/components/basismodule/BasismoduleView';
import DocsLayout from '@/components/docs/DocsLayout';
import DocsIndex from '@/pages/DocsIndex';
import DocViewer from '@/pages/DocViewer';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <ErrorBoundary fallback="Die Navigation konnte nicht geladen werden.">
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<ErrorBoundary fallback="Dashboard konnte nicht geladen werden."><Dashboard /></ErrorBoundary>} />
          <Route path="/einheiten" element={<ErrorBoundary fallback="Einheitenliste konnte nicht geladen werden."><EinheitenListe /></ErrorBoundary>} />
          <Route path="/einheiten/:id" element={<ErrorBoundary fallback="Einheitansicht konnte nicht geladen werden."><EinheitViewManager /></ErrorBoundary>} />
          <Route path="/basismodule" element={<ErrorBoundary fallback="Basismodule konnte nicht geladen werden."><BasismoduleView /></ErrorBoundary>} />
          <Route path="/docs" element={<ErrorBoundary fallback="Dokumentation konnte nicht geladen werden."><DocsLayout /></ErrorBoundary>}>
            <Route index element={<DocsIndex />} />
            <Route path=":slug" element={<DocViewer />} />
          </Route>
          
          {/* ✅ GESCHÜTZT: Admin-Bereich */}
          <Route
            path="/benutzerverwaltung"
            element={
              <ErrorBoundary fallback="Benutzerverwaltung konnte nicht geladen werden.">
                <ProtectedRoute
                  component={Benutzerverwaltung}
                  requiredPermission="kannBenutzerVerwalten"
                  redirectTo="/"
                />
              </ErrorBoundary>
            }
          />
          
          {/* ✅ GESCHÜTZT: Export mit Leseberechtigung */}
          <Route
            path="/moodle-export"
            element={
              <ErrorBoundary fallback="Moodle-Export konnte nicht geladen werden.">
                <ProtectedRoute
                  component={MoodleExport}
                  requiredPermission="kannExportLesen"
                  redirectTo="/"
                />
              </ErrorBoundary>
            }
          />
          
          <Route path="/workspace" element={<ErrorBoundary fallback="Workspace konnte nicht geladen werden."><Workspace /></ErrorBoundary>} />
          <Route path="/einheit/create" element={<ErrorBoundary fallback="Erstellungsassistent konnte nicht geladen werden."><EinheitCreateWizard /></ErrorBoundary>} />
          <Route path="/einheit/export" element={<ErrorBoundary fallback="Export-Center konnte nicht geladen werden."><ExportCenter /></ErrorBoundary>} />
          
          {/* ✅ GESCHÜTZT: Admin-Einstellungen */}
          <Route
            path="/admin-settings"
            element={
              <ErrorBoundary fallback="Admin-Einstellungen konnte nicht geladen werden.">
                <ProtectedRoute
                  component={AdminSettings}
                  requiredPermission="kannBenutzerVerwalten"
                  redirectTo="/"
                />
              </ErrorBoundary>
            }
          />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </ErrorBoundary>
  );
};


function App() {

  return (
    <AuthProvider>
      <RoleProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </RoleProvider>
    </AuthProvider>
  )
}

export default App