import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { RoleProvider } from '@/lib/RoleContext';
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
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/einheiten" element={<EinheitenListe />} />
        <Route path="/einheiten/:id" element={<EinheitViewManager />} />
        <Route path="/basismodule" element={<BasismoduleView />} />
        
        {/* ✅ GESCHÜTZT: Admin-Bereich */}
        <Route
          path="/benutzerverwaltung"
          element={
            <ProtectedRoute
              component={Benutzerverwaltung}
              requiredPermission="kannBenutzerVerwalten"
              redirectTo="/"
            />
          }
        />
        
        {/* ✅ GESCHÜTZT: Export mit Leseberechtigung */}
        <Route
          path="/moodle-export"
          element={
            <ProtectedRoute
              component={MoodleExport}
              requiredPermission="kannExportLesen"
              redirectTo="/"
            />
          }
        />
        
        <Route path="/workspace" element={<Workspace />} />
        <Route path="/einheit/create" element={<EinheitCreateWizard />} />
        <Route path="/einheit/export" element={<ExportCenter />} />
        
        {/* ✅ GESCHÜTZT: Admin-Einstellungen */}
        <Route
          path="/admin-settings"
          element={
            <ProtectedRoute
              component={AdminSettings}
              requiredPermission="kannBenutzerVerwalten"
              redirectTo="/"
            />
          }
        />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
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