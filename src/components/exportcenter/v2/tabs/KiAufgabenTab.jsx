/**
 * KiAufgabenTab.jsx — Tab 5
 *
 * Payload 4 (Micro-Briefings). Ein Item pro KI-Aktivität bzw.
 * KI-Allgemeiner-Aufgabe. Akkordeon analog zu Tab 2.
 */
import React from 'react';
import { Sparkles } from 'lucide-react';
import AirGapBlockCard from '@/components/export/airgap/AirGapBlockCard';
import AirGapBundleGroup from '@/components/export/airgap/AirGapBundleGroup';
import SyncStatusBadge, { planStatusToUiStatus } from '../shared/SyncStatusBadge';

export default function KiAufgabenTab({
  blockStatus,
  blockAggregate,
  microItems,
  microGroups,
  itemPlanLookup,
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
          />
          <code className="text-[10px] text-muted-foreground/70 font-mono">
            {it.key.split('::').pop()}
          </code>
        </span>
      ),
    }));

  return (
    <div className="space-y-3">
      <AirGapBlockCard
        index={5}
        icon={<Sparkles className="w-4 h-4 text-primary" />}
        title="KI-Aufgaben (Micro-Briefings)"
        description="Pro KI-Aktivität / KI-Aufgabe ein schlankes Briefing (GPS, Lernziele, Source-of-Truth, Blueprint). Nur Items mit erstellungs_modus='ki'."
        itemCount={microItems.length}
        delivered={blockStatus.micro.delivered}
        rawDelivered={blockStatus.micro.rawDelivered}
        isStale={blockStatus.micro.isStale || blockAggregate.mbk_micro_payload.hasAnyStale}
        onToggleDelivered={onToggleDelivered}
        onCopy={onCopy}
        onDownload={onDownload}
        onDownloadBundle={microItems.length > 0 ? onDownloadBundle : null}
      >
        {microGroups.length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-2">
            Keine KI-Aktivitäten oder KI-Aufgaben in dieser Einheit.
          </p>
        ) : (
          <div className="space-y-2">
            {microGroups.map((group) => (
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