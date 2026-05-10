/**
 * AirGapBlockCard.jsx
 *
 * Wiederverwendbare Block-Karte für die vier Air-Gap-Payload-Blöcke.
 * Zeigt Titel, Beschreibung, Aktionen (Copy/Download), Übergabe-Checkbox
 * und optional eine Liste von Sub-Items (für Block 3 + 4).
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, Download, FileArchive, CheckCircle2, RotateCcw } from 'lucide-react';

export default function AirGapBlockCard({
  index,
  icon,
  title,
  description,
  // Ein/Aus-Status:
  delivered,
  isStale,
  rawDelivered,
  // Initial-Export (Einheit noch nie exportiert): Stale-Indikator wird
  // als „Neu generieren" entschärft — vor dem ersten Export ist
  // „veraltet" semantisch ohnehin sinnlos. Default false = bestehende
  // UX bleibt erhalten.
  treatStaleAsNew = false,
  onToggleDelivered,
  // Aktionen für das Bundle/Haupt-Payload:
  onCopy,
  onDownload,
  onDownloadBundle, // nur bei Bundle-Blöcken (3+4)
  bundleLabel = 'Bundle.zip herunterladen',
  // Visueller Vorschlag, dass dieser Block weniger prominent wirken soll
  // (z. B. wenn Block 1 noch offen ist). Hat KEINEN Einfluss auf Klickbarkeit.
  dePrioritized = false,
  // Optionale Item-Liste (Block 3 + 4):
  children,
  itemCount = null,
}) {
  return (
    <div
      className={[
        'rounded-lg border bg-card p-4 space-y-3 transition-opacity',
        dePrioritized && !delivered ? 'opacity-90' : '',
        delivered ? 'border-green-300 bg-green-50/40' : 'border-border',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground tabular-nums">{index}.</span>
              <span>{title}</span>
              {itemCount !== null && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({itemCount} Item{itemCount === 1 ? '' : 's'})
                </span>
              )}
              {delivered && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                  <CheckCircle2 className="w-3.5 h-3.5" /> übergeben
                </span>
              )}
              {isStale && !treatStaleAsNew && (
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium text-amber-700"
                  title="Globale Regeln (UI-Bausteine, Mission-Statement, Lerntypen-Definitionen) wurden seit der letzten Generierung geändert."
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Neu generieren empfohlen
                </span>
              )}
            </h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {onCopy && (
            <Button
              size="sm"
              variant={dePrioritized && !delivered ? 'outline' : 'default'}
              onClick={onCopy}
              className="gap-1.5"
              title="Als Markdown-Code-Block in die Zwischenablage kopieren"
            >
              <Copy className="w-3.5 h-3.5" />
              Kopieren
            </Button>
          )}
          {onDownload && (
            <Button
              size="sm"
              variant="outline"
              onClick={onDownload}
              className="gap-1.5"
              title="Als .json-Datei herunterladen"
            >
              <Download className="w-3.5 h-3.5" />
              JSON
            </Button>
          )}
          {onDownloadBundle && (
            <Button
              size="sm"
              variant="outline"
              onClick={onDownloadBundle}
              className="gap-1.5"
              title="Alle Items als ZIP herunterladen"
            >
              <FileArchive className="w-3.5 h-3.5" />
              {bundleLabel}
            </Button>
          )}
        </div>
      </div>

      {isStale && rawDelivered && !treatStaleAsNew && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
          Du hast diesen Block schon einmal als übergeben markiert, aber
          globale Regeln (UI-Bausteine, Mission-Statement, Lerntypen-
          Definitionen) wurden seitdem geändert. Bitte erneut generieren
          und das Häkchen neu setzen.
        </div>
      )}

      {children}

      <label className="flex items-center gap-2 text-sm cursor-pointer pt-1 border-t border-dashed">
        <Checkbox
          checked={delivered}
          onCheckedChange={(v) => onToggleDelivered(!!v)}
        />
        <span className="text-muted-foreground">
          An die MBK übergeben
        </span>
      </label>
    </div>
  );
}