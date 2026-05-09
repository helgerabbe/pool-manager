/**
 * AirGapItemList.jsx
 *
 * Kompakte Liste der Einzel-Items für Block 3 (Task-Content) und Block 4
 * (Micro-Briefings). Pro Item gibt es eigene Copy/Download-Buttons,
 * damit die Lehrkraft auch granular einzelne Lernpakete oder Aktivitäten
 * an die MBK übergeben kann.
 *
 * Zusätzlich: pro Item ein ausklappbarer Vorschau-Bereich, der den
 * tatsächlich generierten JSON-Payload zeigt — analog zur Vorschau im
 * Strukturen-Tab. So sieht der Operator vor dem Übergeben, was die MBK
 * konkret bekommt.
 */
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Download, Eye, EyeOff } from 'lucide-react';

function ItemRow({ item, onCopyItem, onDownloadItem }) {
  const [showPreview, setShowPreview] = useState(false);

  const previewJson = useMemo(() => {
    if (!showPreview || typeof item.build !== 'function') return '';
    try {
      return JSON.stringify(item.build(), null, 2);
    } catch (err) {
      return `// Vorschau konnte nicht erzeugt werden: ${err?.message || 'unbekannt'}`;
    }
  }, [showPreview, item]);

  return (
    <li className="rounded-md border bg-background text-xs">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5">
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{item.label}</div>
          {item.subLabel && (
            <div className="text-[11px] text-muted-foreground truncate">{item.subLabel}</div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 gap-1 text-xs"
            onClick={() => setShowPreview((v) => !v)}
            title={showPreview ? 'Vorschau ausblenden' : 'Vorschau anzeigen'}
          >
            {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 gap-1 text-xs"
            onClick={() => onCopyItem(item)}
            title="Dieses Item kopieren"
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 gap-1 text-xs"
            onClick={() => onDownloadItem(item)}
            title="Dieses Item als JSON laden"
          >
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </div>
      {showPreview && (
        <div className="px-3 pb-2 pt-0">
          <pre className="rounded border bg-muted/40 p-3 text-[11px] whitespace-pre-wrap font-mono max-h-[50vh] overflow-y-auto">
            {previewJson}
          </pre>
        </div>
      )}
    </li>
  );
}

export default function AirGapItemList({ items, onCopyItem, onDownloadItem, emptyHint }) {
  if (!items || items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic px-2">
        {emptyHint || 'Keine Items vorhanden.'}
      </p>
    );
  }

  return (
    <ul className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
      {items.map((it) => (
        <ItemRow
          key={it.key}
          item={it}
          onCopyItem={onCopyItem}
          onDownloadItem={onDownloadItem}
        />
      ))}
    </ul>
  );
}