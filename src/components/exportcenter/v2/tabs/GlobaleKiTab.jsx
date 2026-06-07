/**
 * GlobaleKiTab.jsx — Schritt 4
 *
 * Payload 1 (System-Kontext). Die Aktionen liegen jetzt auf der
 * To-Do-Zeilen-Ebene (ExportTodoRow); hier nur noch Status + Erläuterung.
 */
import React from 'react';
import SyncStatusBadge, { planStatusToUiStatus } from '../shared/SyncStatusBadge';

export default function GlobaleKiTab({ planItem, isInitialExport = false }) {
  const uiStatus = planItem ? planStatusToUiStatus(planItem.status) : 'in_sync';

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Status dieses Payloads:</span>
        <SyncStatusBadge status={uiStatus} treatStaleAsNew={isInitialExport} />
      </div>
      <p className="text-xs text-muted-foreground max-w-xl">
        Stammdaten der Schule, fach-spezifische Nomenklatur und globale
        MBK-Prompts. Wird übergeben, sobald die generative KI Aufgaben erzeugen
        soll. Zum Prüfen des konkreten Inhalts oben auf „Ansehen" klicken.
      </p>
    </div>
  );
}