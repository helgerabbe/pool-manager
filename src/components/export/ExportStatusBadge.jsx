/**
 * ExportStatusBadge.jsx
 *
 * Visualisiert den Export-/Sync-Zustand eines exportierbaren Items
 * (Einheit oder Basismodul) als kompaktes Badge.
 *
 * Logik (in dieser Reihenfolge geprüft):
 * 1. updated_date > last_exported_at  → "Nach Export geändert"  (rot)
 * 2. last_exported_at && !last_synced_at → "Exportiert"          (blau)
 * 3. !last_synced_at                  → "Neues Element"          (grün)
 * 4. sonst                            → "Update"                 (amber)
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Clock, RotateCw } from 'lucide-react';

export default function ExportStatusBadge({ item }) {
  const isUpdatedAfterExport =
    item.last_exported_at &&
    item.updated_date &&
    new Date(item.updated_date) > new Date(item.last_exported_at);

  if (isUpdatedAfterExport) {
    return (
      <Badge className="bg-red-100 text-red-700 gap-1">
        <AlertTriangle className="w-3 h-3" />
        Nach Export geändert
      </Badge>
    );
  }

  const isExportedWaitingSync = item.last_exported_at && !item.last_synced_at;
  if (isExportedWaitingSync) {
    return (
      <Badge className="bg-blue-100 text-blue-700 gap-1">
        <Clock className="w-3 h-3" />
        Exportiert
      </Badge>
    );
  }

  if (!item.last_synced_at) {
    return (
      <Badge className="bg-green-100 text-green-700 gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Neues Element
      </Badge>
    );
  }

  return (
    <Badge className="bg-amber-100 text-amber-700 gap-1">
      <RotateCw className="w-3 h-3" />
      Update
    </Badge>
  );
}