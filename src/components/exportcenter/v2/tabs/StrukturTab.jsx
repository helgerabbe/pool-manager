/**
 * StrukturTab.jsx — Tab 1
 *
 * Payload 2 (Struktur der Einheit). Ein einziger Block mit
 * Copy/Download und Übergabe-Haken. Drift-Status kommt aus dem
 * bulkPlan + Block-Aggregat.
 *
 * Zusätzlich: Vorschau des generierten JSON-Payloads (analog zur
 * Meta-Prompt-Vorschau), damit der Operator vor der Übergabe sieht,
 * was tatsächlich an die MBK geht.
 */
import React, { useMemo } from 'react';
import { LayoutList } from 'lucide-react';
import AirGapBlockCard from '@/components/export/airgap/AirGapBlockCard';
import SyncStatusBadge, { planStatusToUiStatus } from '../shared/SyncStatusBadge';

export default function StrukturTab({
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
        index={1}
        icon={<LayoutList className="w-4 h-4 text-primary" />}
        title="Struktur der Einheit"
        description='Themenfelder, Lernpakete, Lernziele, Aktivitäts-Slots und alle vier Lernpfade — als "Inhaltsverzeichnis" für die MBK.'
        delivered={blockStatus.structure.delivered}
        rawDelivered={blockStatus.structure.rawDelivered}
        isStale={blockStatus.structure.isStale || blockAggregate.mbk_structure_payload.hasAnyStale}
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