/**
 * UiConfigTab.jsx — Schritt 1 (airgap-1.5.0)
 *
 * Payload 0 (UI-Config). Enthält die drei UI-Bausteine
 * (css_variables, tab_bar_html, default_header_html), die jede
 * generierte HTML-Datei der MBK in den `<head>` und Header injiziert.
 *
 * Die Aktionen (Kopieren/Download/Übergeben/Ansehen) liegen jetzt auf der
 * To-Do-Zeilen-Ebene (ExportTodoRow). Dieser Akkordeon-Inhalt zeigt nur
 * noch eine kurze Erläuterung + den Status-Hinweis.
 */
import React from 'react';
import SyncStatusBadge, { planStatusToUiStatus } from '../shared/SyncStatusBadge';

export default function UiConfigTab({ planItem, isInitialExport = false }) {
  const uiStatus = planItem ? planStatusToUiStatus(planItem.status) : 'in_sync';

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Status dieses Payloads:</span>
        <SyncStatusBadge status={uiStatus} treatStaleAsNew={isInitialExport} />
      </div>
      <p className="text-xs text-muted-foreground max-w-xl">
        CSS-Variablen, Tab-Bar und Header-Template — alles, was die generierten
        HTML-Dateien optisch zusammenhält. Wird von der Grafikabteilung im
        MBK-Prompt-Manager (Sektion „🎨 UI-Bausteine") gepflegt. Zum Prüfen des
        konkreten Inhalts oben auf „Ansehen" klicken.
      </p>
    </div>
  );
}