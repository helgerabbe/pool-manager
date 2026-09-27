import React from 'react';
import { Navigate } from 'react-router-dom';
import { useImportCenterZugang } from '@/hooks/useImportCenterZugang';
import ImportCenter from '@/pages/ImportCenter';

/** Route-Schranke: Vollzugang oder Mitarbeiter mindestens einer Einheit. */
export default function ImportCenterRoute() {
  const { isLoading, hatZugang } = useImportCenterZugang();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }
  if (!hatZugang) return <Navigate to="/" replace />;
  return <ImportCenter />;
}