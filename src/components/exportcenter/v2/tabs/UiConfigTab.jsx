/**
 * UiConfigTab.jsx — Tab 0 (airgap-1.5.0)
 *
 * Payload 0 (UI-Config). Enthält die drei UI-Bausteine
 * (css_variables, tab_bar_html, default_header_html), die jede
 * generierte HTML-Datei der MBK in den `<head>` und Header injiziert.
 *
 * Architektonisch ganz vorne in der Tab-Liste, weil die UI-Config —
 * genau wie der System-Kontext — eine globale Grundvoraussetzung für
 * alle nachgelagerten Payloads ist. Pflege geschieht weiterhin über
 * den MBK-Prompt-Manager (Sektion „🎨 UI-Bausteine").
 */
import React from 'react';
import { Palette } from 'lucide-react';
import AirGapBlockCard from '@/components/export/airgap/AirGapBlockCard';
import SyncStatusBadge, { planStatusToUiStatus } from '../shared/SyncStatusBadge';

export default function UiConfigTab({
  blockStatus,
  blockAggregate,
  planItem,
  onToggleDelivered,
  onCopy,
  onDownload,
}) {
  const uiStatus = planItem ? planStatusToUiStatus(planItem.status) : 'in_sync';
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Status dieses Payloads:</span>
        <SyncStatusBadge status={uiStatus} />
      </div>
      <AirGapBlockCard
        index={0}
        icon={<Palette className="w-4 h-4 text-primary" />}
        title="UI-Config (Darstellungs-Layer)"
        description="CSS-Variablen, Tab-Bar und Header-Template — alles, was die generierten HTML-Dateien optisch zusammenhält. Wird von der Grafikabteilung im MBK-Prompt-Manager (Sektion „🎨 UI-Bausteine“) gepflegt und unabhängig vom Inhalts-Layer aktualisiert."
        delivered={blockStatus.ui_config.delivered}
        rawDelivered={blockStatus.ui_config.rawDelivered}
        isStale={blockStatus.ui_config.isStale || blockAggregate.mbk_ui_config.hasAnyStale}
        onToggleDelivered={onToggleDelivered}
        onCopy={onCopy}
        onDownload={onDownload}
      />
    </div>
  );
}