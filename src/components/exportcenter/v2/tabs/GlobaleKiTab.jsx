/**
 * GlobaleKiTab.jsx — Tab 3
 *
 * Payload 1 (System-Kontext). Wird erst beim Aktivieren der
 * generativen MBK-Aufgaben gebraucht — daher in dieser Position.
 */
import React from 'react';
import { Globe2 } from 'lucide-react';
import AirGapBlockCard from '@/components/export/airgap/AirGapBlockCard';
import SyncStatusBadge, { planStatusToUiStatus } from '../shared/SyncStatusBadge';

export default function GlobaleKiTab({
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
        index={3}
        icon={<Globe2 className="w-4 h-4 text-primary" />}
        title="Globale KI (System-Kontext)"
        description="Stammdaten der Schule, fach-spezifische Nomenklatur und globale MBK-Prompts. Wird übergeben, sobald die generative KI Aufgaben erzeugen soll."
        delivered={blockStatus.system_context.delivered}
        rawDelivered={blockStatus.system_context.rawDelivered}
        isStale={blockStatus.system_context.isStale || blockAggregate.mbk_system_context.hasAnyStale}
        onToggleDelivered={onToggleDelivered}
        onCopy={onCopy}
        onDownload={onDownload}
      />
    </div>
  );
}