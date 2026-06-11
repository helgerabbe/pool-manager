import React, { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { isSupabase } from '@/services/schueler/backend';
import SchuelerOnlyLayout from '@/components/schueler/SchuelerOnlyLayout';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { RoleProvider } from '@/lib/RoleContext';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/lib/ProtectedRoute';
// Lehrer-/Admin-Bereich: Lazy Loading, damit der Schüler-Build (GitHub Pages)
// diesen Code beim ersten Öffnen NICHT mit herunterladen muss.
const AppLayout = lazy(() => import('@/components/layout/AppLayout'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const EinheitenListe = lazy(() => import('@/pages/EinheitenListe'));
const Benutzerverwaltung = lazy(() => import('@/pages/Benutzerverwaltung'));
const MoodleExport = lazy(() => import('@/pages/MoodleExport'));
const Workspace = lazy(() => import('@/pages/Workspace'));
const AdminSettings = lazy(() => import('@/pages/AdminSettings'));
const EinheitCreateWizard = lazy(() => import('@/pages/EinheitCreateWizard'));
const ExportCenter = lazy(() => import('@/pages/ExportCenter'));
const MBKConsole = lazy(() => import('@/pages/MBKConsole'));
const EinheitViewManager = lazy(() => import('@/components/workspace/EinheitViewManager'));
const BasismoduleListe = lazy(() => import('@/pages/BasismoduleListe'));
const BasismodulViewManager = lazy(() => import('@/components/basismodule/BasismodulViewManager'));
const DocsLayout = lazy(() => import('@/components/docs/DocsLayout'));
const DocsIndex = lazy(() => import('@/pages/DocsIndex'));
const DocViewer = lazy(() => import('@/pages/DocViewer'));
import StudentArea from '@/pages/StudentArea';
import PoolzeitStart from '@/pages/schueler/PoolzeitStart';
import Lerntagebuch from '@/pages/schueler/Lerntagebuch';
import FachSeite from '@/pages/schueler/FachSeite';
import EinheitOnboarding from '@/pages/schueler/EinheitOnboarding';
import EinheitOnboardingQuiz from '@/pages/schueler/EinheitOnboardingQuiz';
import EinheitDashboard from '@/pages/schueler/EinheitDashboard';
import SupabaseLoginGate from '@/components/schueler/auth/SupabaseLoginGate';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // ── Supabase-Build (GitHub Pages): NUR der Schülerbereich existiert. ──
  // Alle Lehrer-/Admin-Routen sind nicht registriert; jede andere URL
  // leitet auf /lernen um. Base44-Auth/-Layout werden komplett umgangen.
  if (isSupabase()) {
    return (
      <ErrorBoundary fallback="Die Schüler-App konnte nicht geladen werden.">
        <Routes>
          <Route element={<SchuelerOnlyLayout />}>
            <Route element={<SupabaseLoginGate />}>
              <Route path="/lernen" element={<StudentArea />} />
              <Route path="/lernen/poolzeit" element={<PoolzeitStart />} />
              <Route path="/lernen/lerntagebuch" element={<Lerntagebuch />} />
              <Route path="/lernen/fach" element={<FachSeite />} />
              <Route path="/lernen/einheit" element={<EinheitOnboarding />} />
              <Route path="/lernen/onboarding" element={<EinheitOnboardingQuiz />} />
              <Route path="/lernen/dashboard" element={<EinheitDashboard />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/lernen" replace />} />
        </Routes>
      </ErrorBoundary>
    );
  }

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
      <Suspense
        fallback={
          <div className="fixed inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          </div>
        }
      >
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<ErrorBoundary fallback="Dashboard konnte nicht geladen werden."><Dashboard /></ErrorBoundary>} />
          <Route path="/einheiten" element={<ErrorBoundary fallback="Einheitenliste konnte nicht geladen werden."><EinheitenListe /></ErrorBoundary>} />
          <Route path="/einheiten/:id" element={<ErrorBoundary fallback="Einheitansicht konnte nicht geladen werden."><EinheitViewManager /></ErrorBoundary>} />
          <Route path="/basismodule" element={<ErrorBoundary fallback="Basismodule konnte nicht geladen werden."><BasismoduleListe /></ErrorBoundary>} />
          <Route path="/basismodule/:id" element={<ErrorBoundary fallback="Basismodul konnte nicht geladen werden."><BasismodulViewManager /></ErrorBoundary>} />
          <Route path="/docs" element={<ErrorBoundary fallback="Dokumentation konnte nicht geladen werden."><DocsLayout /></ErrorBoundary>}>
            <Route index element={<DocsIndex />} />
            <Route path=":slug" element={<DocViewer />} />
          </Route>

          {/* Schülerbereich: Im Supabase-Modus durch Login-Gate geschützt,
              im Base44-Modus rendert das Gate transparent durch. */}
          <Route element={<SupabaseLoginGate />}>
            <Route path="/lernen" element={<StudentArea />} />
            <Route path="/lernen/poolzeit" element={<PoolzeitStart />} />
            <Route path="/lernen/lerntagebuch" element={<Lerntagebuch />} />
            <Route path="/lernen/fach" element={<FachSeite />} />
            <Route path="/lernen/einheit" element={<EinheitOnboarding />} />
            <Route path="/lernen/onboarding" element={<EinheitOnboardingQuiz />} />
            <Route path="/lernen/dashboard" element={<EinheitDashboard />} />
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
          {/* Phase G: Eigenständiges Export-Center auf Hauptmenü-Ebene */}
          <Route
            path="/export-center"
            element={
              <ErrorBoundary fallback="Export-Center konnte nicht geladen werden.">
                <ProtectedRoute
                  component={ExportCenter}
                  requiredPermission="kannExportBedienen"
                  redirectTo="/"
                />
              </ErrorBoundary>
            }
          />

          {/* Interne MBK-Konsole (Proof-of-Concept, Stufe 1: Architekt) */}
          <Route
            path="/mbk"
            element={
              <ErrorBoundary fallback="MBK-Konsole konnte nicht geladen werden.">
                <ProtectedRoute
                  component={MBKConsole}
                  requiredPermission="kannExportBedienen"
                  redirectTo="/"
                />
              </ErrorBoundary>
            }
          />
          
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
      </Suspense>
    </ErrorBoundary>
  );
};


function App() {

  return (
    <AuthProvider>
      <RoleProvider>
        <QueryClientProvider client={queryClientInstance}>
          {/* basename: auf Base44 ist BASE_URL "/" (kein Effekt); im GitHub-Pages-Build
              läuft die App unter /<repo>/ – Vite setzt BASE_URL entsprechend. */}
          <Router basename={import.meta.env.BASE_URL}>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </RoleProvider>
    </AuthProvider>
  )
}

export default App