/**
 * AufgabenTab.jsx — Tab 2
 *
 * Payload 3 (manuelle Aufgabeninhalte). Akkordeon nach
 * Themenfeld → Lernpaket / Allgemeine Aufgabe. Pro Item ein
 * Sync-Status-Badge.
 */
import React from 'react';
import { Package, Bot, AlertTriangle } from 'lucide-react';
import AirGapBlockCard from '@/components/export/airgap/AirGapBlockCard';
import AirGapBundleGroup from '@/components/export/airgap/AirGapBundleGroup';
import SyncStatusBadge, { planStatusToUiStatus } from '../shared/SyncStatusBadge';

export default function AufgabenTab({
  blockStatus,
  blockAggregate,
  taskItems,
  taskGroups,
  taskBundle,
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
  // Erweitert jedes Item um einen sichtbaren Status-Badge + KI-Hinweis.
  // Wichtig: KI-Aktivitäten werden in Tab "Aufgaben" (Payload 3) bewusst
  // mit einem klaren Warnhinweis versehen, damit der Operator nicht
  // versehentlich versucht, sie deterministisch zu erstellen — die
  // tatsächliche KI-Erstellung passiert in Tab 5 (KI-Aufgaben).
  const decorateItems = (items) =>
    items.map((it) => {
      const kiSeverity = it.kiSeverity || 'none';
      const kiHintColor =
        kiSeverity === 'full'
          ? 'text-amber-700 bg-amber-50 border-amber-200'
          : 'text-blue-700 bg-blue-50 border-blue-200';
      return {
        ...it,
        // AirGapBundleGroup übergibt Sub-Komponenten den raw item — wir
        // erweitern nur das subLabel optisch.
        subLabel: (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span className="text-foreground/80">{it.subLabel}</span>
            <SyncStatusBadge
              status={planStatusToUiStatus(itemPlanLookup(it.key)?.status)}
              treatStaleAsNew={isInitialExport}
            />
            {it.kiHint && (
              <span
                className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${kiHintColor}`}
                title={it.kiHint}
              >
                {kiSeverity === 'full' ? (
                  <AlertTriangle className="w-3 h-3" />
                ) : (
                  <Bot className="w-3 h-3" />
                )}
                {it.kiHint}
              </span>
            )}
            <code className="text-[10px] text-muted-foreground/70 font-mono">
              {it.key.split('::').pop()}
            </code>
          </span>
        ),
      };
    });

  return (
    <div className="space-y-3">
      <AirGapBlockCard
        index={2}
        icon={<Package className="w-4 h-4 text-primary" />}
        title="Aufgabeninhalte"
        description={'Pro Lernpaket bzw. Allgemeiner Aufgabe: ausgearbeitete Inhalte (manuelle field_values, Master-Aufgaben). KI-Aktivitäten erscheinen hier NUR als Platzhalter — die eigentlichen KI-Inhalte werden in Tab „KI-Aufgaben" (Payload 4) gepflegt und übergeben.'}
        itemCount={taskItems.length}
        delivered={blockStatus.task_content.delivered}
        rawDelivered={blockStatus.task_content.rawDelivered}
        isStale={blockStatus.task_content.isStale || blockAggregate.mbk_task_content_payload.hasAnyStale}
        treatStaleAsNew={isInitialExport}
        onToggleDelivered={onToggleDelivered}
        onCopy={onCopy}
        onDownload={onDownload}
        onDownloadBundle={taskItems.length > 0 ? onDownloadBundle : null}
      >
        {taskGroups.length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-2">
            Keine Lernpakete oder Allgemeine Aufgaben (Ebene 2/3) vorhanden.
          </p>
        ) : (
          <div className="space-y-2">
            {taskGroups.map((group) => (
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