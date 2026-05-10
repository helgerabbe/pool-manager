/**
 * GlobaleKiTab.jsx — Tab 3
 *
 * Payload 1 (System-Kontext). Wird erst beim Aktivieren der
 * generativen MBK-Aufgaben gebraucht — daher in dieser Position.
 */
import React, { useMemo } from 'react';
import { Globe2 } from 'lucide-react';
import AirGapBlockCard from '@/components/export/airgap/AirGapBlockCard';
import SyncStatusBadge, { planStatusToUiStatus } from '../shared/SyncStatusBadge';

export default function GlobaleKiTab({
  blockStatus,
  blockAggregate,
  planItem,
  payload,
  isInitialExport = false,
  onToggleDelivered,
  onCopy,
  onDownload,
}) {
  const uiStatus = planItem ? planStatusToUiStatus(planItem.status) : 'in_sync';

  const payloadJson = useMemo(() => {
    try {
      return payload ? JSON.stringify(payload, null, 2) : '';
    } catch {
      return '';
    }
  }, [payload]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Status dieses Payloads:</span>
        <SyncStatusBadge status={uiStatus} treatStaleAsNew={isInitialExport} />
      </div>
      <AirGapBlockCard
        index={3}
        icon={<Globe2 className="w-4 h-4 text-primary" />}
        title="Globale KI (System-Kontext)"
        description="Stammdaten der Schule, fach-spezifische Nomenklatur und globale MBK-Prompts. Wird übergeben, sobald die generative KI Aufgaben erzeugen soll."
        delivered={blockStatus.system_context.delivered}
        rawDelivered={blockStatus.system_context.rawDelivered}
        isStale={blockStatus.system_context.isStale || blockAggregate.mbk_system_context.hasAnyStale}
        treatStaleAsNew={isInitialExport}
        onToggleDelivered={onToggleDelivered}
        onCopy={onCopy}
        onDownload={onDownload}
      />

      {payloadJson && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground px-1">
            Vorschau des generierten Payloads (wird so an die MBK übergeben):
          </p>
          <pre className="rounded-lg border bg-muted/40 p-4 text-xs whitespace-pre-wrap font-mono max-h-[60vh] overflow-y-auto">
            {payloadJson}
          </pre>
        </div>
      )}
    </div>
  );
}