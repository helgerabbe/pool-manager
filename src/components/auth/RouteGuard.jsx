import React from 'react';
import { Navigate } from 'react-router-dom';
import { useRBAC } from '@/hooks/useRBAC';
import { canAccessEinheit, canAccessBasismodul, getDefaultRedirectPath } from '@/lib/routeGuards';

/**
 * Route-Guard Component für Einheiten-basierte Routen
 * 
 * @param {JSX.Element} children - Die zu schützende Komponente
 * @param {string} requiredFach - Das erforderliche Fach
 * @param {boolean} requireEdit - Ob Bearbeitungsrechte erforderlich sind (Standard: true)
 * 
 * @example
 * <RouteGuard requiredFach="Deutsch" requireEdit={true}>
 *   <EinheitDetailPage />
 * </RouteGuard>
 */
export function EinheitRouteGuard({ children, requiredFach, requireEdit = true }) {
  const { isLoading, rolle, faecher } = useRBAC();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const hasAccess = canAccessEinheit(rolle, faecher, requiredFach);
  if (!hasAccess) {
    return <Navigate to={getDefaultRedirectPath(rolle)} replace />;
  }

  return children;
}

/**
 * Route-Guard Component für Basismodul-Routen
 * 
 * @param {JSX.Element} children
 * @param {string} requiredFach - Das erforderliche Fach des Moduls
 */
export function BasismodulRouteGuard({ children, requiredFach }) {
  const { isLoading, rolle, faecher } = useRBAC();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const hasAccess = canAccessBasismodul(rolle, faecher, requiredFach);
  if (!hasAccess) {
    return <Navigate to={getDefaultRedirectPath(rolle)} replace />;
  }

  return children;
}

/**
 * Generic Route-Guard für benutzerdefinierte Berechtigungsprüfungen
 */
export function ProtectedRoute({ children, permissionCheck, fallbackPath = '/' }) {
  const { isLoading, permissions, rolle } = useRBAC();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const hasPermission = typeof permissionCheck === 'function' 
    ? permissionCheck(permissions, rolle) 
    : permissionCheck;

  if (!hasPermission) {
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
}