/**
 * SystembausteineTab.jsx — Tab 4 (airgap-1.6.0)
 *
 * Payload 5 (`mbk_systembaustein_payload`). Pro Lernpfad-Referenz × Lerntyp
 * ein eigenes Briefing-Item — derselbe Baustein erhält in unterschiedlichen
 * Lernpfaden hochgradig differenzierte Inhalte (Persona, Sprache, Tiefe).
 *
 * UI analog zu KiAufgabenTab: Block-Card + Bundle-Groups (gruppiert pro
 * Lerntyp), Sync-Status pro Item, Vorschau pro Item.
 */
import React from 'react';
import { Puzzle } from 'lucide-react';
import AirGapBlockCard from '@/components/export/airgap/AirGapBlockCard';
import AirGapBundleGroup from '@/components/export/airgap/AirGapBundleGroup';
import SyncStatusBadge, { planStatusToUiStatus } from '../shared/SyncStatusBadge';

export default function SystembausteineTab({
  blockStatus,
  blockAggregate,
  systembausteinItems,
  systembausteinGroups,
  itemPlanLookup,
  isInitialExport = false,
  onToggleDelivered,
  onCopy,
  onDownload,
  onDownloadBundle,
  onCopyItem,
  onDownloadItem,
  onDownloadGroupZip,
}) {
  const decorateItems = (items) =>
    items.map((it) => ({
      ...it,
      subLabel: (
        <span className="inline-flex items-center gap-1.5">
          <span>{it.subLabel}</span>
          <SyncStatusBadge
            status={planStatusToUiStatus(itemPlanLookup(it.key)?.status)}
            treatStaleAsNew={isInitialExport}
          />
          <code className="text-[10px] text-muted-foreground/70 font-mono">
            {it.bausteinId}
          </code>
        </span>
      ),
    }));

  return (
    <div className="space-y-3">
      <AirGapBlockCard
        index={4}
        icon={<Puzzle className="w-4 h-4 text-primary" />}
        title="Systembausteine (Pro Lerntyp)"
        description='Pro Lernpfad-Referenz × Lerntyp ein eigenes Briefing. Derselbe Baustein (z.B. „Einführung in die Einheit") erhält in jedem Pfad einen persona-spezifisch unterschiedlichen Inhalt. Quelle: SystemBausteine-Verwaltung (export_instruktion) + Lernpfad-Konfiguration der Einheit.'
        itemCount={systembausteinItems.length}
        delivered={blockStatus.systembausteine.delivered}
        rawDelivered={blockStatus.systembausteine.rawDelivered}
        isStale={blockStatus.systembausteine.isStale || blockAggregate.mbk_systembaustein_payload.hasAnyStale}
        treatStaleAsNew={isInitialExport}
        onToggleDelivered={onToggleDelivered}
        onCopy={onCopy}
        onDownload={onDownload}
        onDownloadBundle={systembausteinItems.length > 0 ? onDownloadBundle : null}
      >
        {systembausteinGroups.length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-2">
            Keine Systembausteine in den Lernpfaden dieser Einheit referenziert.
          </p>
        ) : (
          <div className="space-y-2">
            {systembausteinGroups.map((group) => (
              <AirGapBundleGroup
                key={group.key}
                group={{ ...group, items: decorateItems(group.items) }}
                onCopyItem={onCopyItem}
                onDownloadItem={onDownloadItem}
                onDownloadGroupZip={onDownloadGroupZip}
              />
            ))}
          </div>
        )}
      </AirGapBlockCard>
    </div>
  );
}