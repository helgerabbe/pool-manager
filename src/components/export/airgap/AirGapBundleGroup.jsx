/**
 * AirGapBundleGroup.jsx
 *
 * Eine kollabierbare Gruppen-Karte für ein UI-Bundle in Block 3 oder 4
 * des Air-Gap-Übergabe-Centers. Pro Bundle gibt es:
 *   - eine Kopfzeile mit Label, Item-Anzahl und Toggle (auf/zu)
 *   - eine Bundle-ZIP-Aktion (alle Items dieser Gruppe in ein Mini-ZIP)
 *   - die Liste der Einzel-Items via AirGapItemList
 *
 * Wichtig: Diese Komponente ist rein darstellend. Die Items werden 1:1
 * vom Panel durchgereicht; die Bundle-ZIP-Aktion komponiert nur die
 * passenden Einzel-Files.
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, FileArchive } from 'lucide-react';
import AirGapItemList from './AirGapItemList';

export default function AirGapBundleGroup({
  group,
  onCopyItem,
  onDownloadItem,
  onDownloadGroupZip, // (group) => void
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const itemCount = group?.items?.length ?? 0;

  return (
    <div className="rounded-md border bg-background">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-80"
        >
          {open ? (
            <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
          )}
          <span className="text-sm font-medium truncate">{group.label}</span>
          <span className="text-[11px] text-muted-foreground shrink-0">
            ({itemCount} Item{itemCount === 1 ? '' : 's'})
          </span>
        </button>
        {onDownloadGroupZip && itemCount > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 gap-1 text-xs shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onDownloadGroupZip(group);
            }}
            title="Diese Gruppe als ZIP herunterladen"
          >
            <FileArchive className="w-3.5 h-3.5" />
            ZIP
          </Button>
        )}
      </div>
      {open && (
        <div className="px-3 pb-3 pt-1 border-t">
          <AirGapItemList
            items={group.items}
            onCopyItem={onCopyItem}
            onDownloadItem={onDownloadItem}
            emptyHint="Keine Items in dieser Gruppe."
          />
        </div>
      )}
    </div>
  );
}