/**
 * StrukturTab.jsx — Schritt 2
 *
 * Payload 2 (Struktur der Einheit). Die Aktionen liegen jetzt auf der
 * To-Do-Zeilen-Ebene (ExportTodoRow); hier nur noch Status + Erläuterung.
 */
import React from 'react';
import SyncStatusBadge, { planStatusToUiStatus } from '../shared/SyncStatusBadge';

export default function StrukturTab({ planItem, isInitialExport = false }) {
  const uiStatus = planItem ? planStatusToUiStatus(planItem.status) : 'in_sync';

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Status dieses Payloads:</span>
        <SyncStatusBadge status={uiStatus} treatStaleAsNew={isInitialExport} />
      </div>
      <p className="text-xs text-muted-foreground max-w-xl">
        Themenfelder, Lernpakete, Lernziele, Aktivitäts-Slots und alle vier
        Lernpfade — als „Inhaltsverzeichnis" für die MBK. Zum Prüfen des
        konkreten Inhalts oben auf „Ansehen" klicken.
      </p>
    </div>
  );
}