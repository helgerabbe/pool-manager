/**
 * ProtectedRoute.jsx
 * 
 * Route-Guard Komponente, die:
 * 1. RBAC-Daten lädt BEVOR die Komponente rendert (kein FOUC)
 * 2. Berechtigung validiert
 * 3. Bei fehlender Auth automatisch zu "/" redirected
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useRBAC } from '@/hooks/useRBAC';

export default function ProtectedRoute({
  component: Component,
  requiredPermission,
  redirectTo = '/'
}) {
  const { isLoading, permissions } = useRBAC();

  // Solange Loading: NUR ein Spinner, keine Daten preisgeben
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Validierung: Hat der User die erforderliche Permission?
  const hasPermission = requiredPermission
    ? permissions[requiredPermission] === true
    : true;

  if (!hasPermission) {
    return <Navigate to={redirectTo} replace />;
  }

  // ✅ Alles OK: Komponente mit Daten rendern (NO FLASH!)
  return <Component />;
}