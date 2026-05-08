/**
 * AirGapItemList.jsx
 *
 * Kompakte Liste der Einzel-Items für Block 3 (Task-Content) und Block 4
 * (Micro-Briefings). Pro Item gibt es eigene Copy/Download-Buttons,
 * damit die Lehrkraft auch granular einzelne Lernpakete oder Aktivitäten
 * an die MBK übergeben kann.
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Download } from 'lucide-react';

export default function AirGapItemList({ items, onCopyItem, onDownloadItem, emptyHint }) {
  if (!items || items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic px-2">
        {emptyHint || 'Keine Items vorhanden.'}
      </p>
    );
  }

  return (
    <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
      {items.map((it) => (
        <li
          key={it.key}
          className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-1.5 text-xs"
        >
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{it.label}</div>
            {it.subLabel && (
              <div className="text-[11px] text-muted-foreground truncate">{it.subLabel}</div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 gap-1 text-xs"
              onClick={() => onCopyItem(it)}
              title="Dieses Item kopieren"
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 gap-1 text-xs"
              onClick={() => onDownloadItem(it)}
              title="Dieses Item als JSON laden"
            >
              <Download className="w-3 h-3" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}