/**
 * AufgabenTab.jsx — Schritt 3
 *
 * Payload 3 (manuelle Aufgabeninhalte). Alle Aufgaben werden auf einen
 * Schlag als ein gebündeltes Payload erstellt — der Operator muss sie
 * NICHT einzeln erzeugen. Diese Liste dient nur der Kontrolle (welche
 * Items stecken drin) und bietet pro Item Copy/Download.
 *
 * Die Haupt-Aktionen (Kopieren/Download/Übergeben/Ansehen für das ganze
 * Bündel) liegen auf der To-Do-Zeilen-Ebene (ExportTodoRow).
 */
import React from 'react';
import { Bot, AlertTriangle, FileArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AirGapBundleGroup from '@/components/export/airgap/AirGapBundleGroup';
import SyncStatusBadge, { planStatusToUiStatus } from '../shared/SyncStatusBadge';

export default function AufgabenTab({
  taskItems,
  taskGroups,
  itemPlanLookup,
  isInitialExport = false,
  onDownloadBundle,
  onCopyItem,
  onDownloadItem,
  onDownloadGroupZip,
}) {
  const decorateItems = (items) =>
    items.map((it) => {
      const kiSeverity = it.kiSeverity || 'none';
      const kiHintColor =
        kiSeverity === 'full'
          ? 'text-amber-700 bg-amber-50 border-amber-200'
          : 'text-blue-700 bg-blue-50 border-blue-200';
      return {
        ...it,
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
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground">
          {taskItems.length} Item{taskItems.length === 1 ? '' : 's'} — werden
          gemeinsam als ein Bündel übergeben. KI-Aktivitäten erscheinen hier nur
          als Platzhalter (Inhalte → Schritt „KI-Aufgaben").
        </p>
        {taskItems.length > 0 && onDownloadBundle && (
          <Button size="sm" variant="outline" onClick={onDownloadBundle} className="gap-1.5">
            <FileArchive className="w-3.5 h-3.5" />
            Bundle.zip
          </Button>
        )}
      </div>

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
    </div>
  );
}