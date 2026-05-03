/**
 * AufgabeExportStatusRow.jsx
 *
 * Kompakte Status-Zeile für das Detail-Panel einer AllgemeineAufgabe.
 * Zeigt nebeneinander zwei "Dots" für Moodle und Brian.study mit dem
 * jeweils aktuellen Sync-Status. Beim Hovern erklärt ein Tooltip den
 * Zustand in Klartext, damit der Lehrkraft sofort klar wird, was als
 * Nächstes zu tun ist.
 *
 * Mögliche Status-Werte (aus dem Schema): new, pending, synced,
 * modified, error.
 *
 * Wichtig: dies ist eine reine Anzeige-Komponente — keine Mutationen,
 * keine Locks. Die State-Maschine bleibt unverändert.
 */
import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ── Status → visuelle + textuelle Bedeutung ────────────────────────────────
// Klassen sind als statische Strings definiert (Tailwind-Purge-safe).
const STATUS_META = {
  new: {
    label: 'noch nicht exportiert',
    dotClass: 'bg-slate-300 border-slate-400',
    textClass: 'text-slate-600',
    tooltip: 'Diese Aufgabe wurde noch nie exportiert.',
  },
  pending: {
    label: 'wartet auf Export-Bestätigung',
    dotClass: 'bg-orange-400 border-orange-500 animate-pulse',
    textClass: 'text-orange-700',
    tooltip:
      'Aufgabe wurde im Export-Cockpit für den nächsten Lauf vorgemerkt. Solange dieser Status anliegt, ist die Aufgabe gesperrt – auch die Freigabe kann nicht mehr zurückgenommen werden.',
  },
  synced: {
    label: 'live im System',
    dotClass: 'bg-green-500 border-green-600',
    textClass: 'text-green-700',
    tooltip:
      'Die aktuelle Version dieser Aufgabe ist erfolgreich im Zielsystem angekommen.',
  },
  modified: {
    label: 'geändert seit letztem Export',
    dotClass: 'bg-amber-400 border-amber-500',
    textClass: 'text-amber-700',
    tooltip:
      'Diese Aufgabe ist bereits im Zielsystem vorhanden, wurde aber lokal verändert. Bitte erneut freigeben, damit die neue Version exportiert werden kann.',
  },
  error: {
    label: 'Export fehlgeschlagen',
    dotClass: 'bg-red-500 border-red-600',
    textClass: 'text-red-700',
    tooltip:
      'Beim letzten Export ist ein Fehler aufgetreten. Das Export-Team muss den Lauf wiederholen.',
  },
};

const FALLBACK = STATUS_META.new;

function getMeta(status) {
  return STATUS_META[status] || FALLBACK;
}

function StatusDot({ system, status }) {
  const meta = getMeta(status);
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <span
          className="inline-flex items-center gap-1.5 cursor-help select-none"
          aria-label={`${system}: ${meta.label}`}
        >
          <span
            className={cn(
              'inline-block w-2.5 h-2.5 rounded-full border',
              meta.dotClass
            )}
          />
          <span className="text-[11px] font-medium text-muted-foreground">
            {system}
          </span>
          <span className={cn('text-[11px]', meta.textClass)}>
            {meta.label}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-left leading-snug">
        <div className="font-semibold mb-0.5">{system}: {meta.label}</div>
        <div className="text-[11px] opacity-90">{meta.tooltip}</div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Bestimmt den effektiven Moodle-Status. `sync_status` ist das
 * legacy-Feld (siehe Logbuch §15) und wird parallel gepflegt; wir
 * lesen `moodle_sync_status` zuerst und fallen auf `sync_status`
 * zurück, damit Bestandsdaten korrekt angezeigt werden.
 */
function resolveMoodleStatus(aufgabe) {
  return aufgabe?.moodle_sync_status || aufgabe?.sync_status || 'new';
}

export default function AufgabeExportStatusRow({ aufgabe }) {
  if (!aufgabe) return null;
  const moodleStatus = resolveMoodleStatus(aufgabe);
  const brianStatus = aufgabe.brian_sync_status || 'new';

  return (
    <TooltipProvider>
      <div className="flex items-center gap-x-4 gap-y-1 flex-wrap px-3 py-1.5 rounded-lg bg-muted/30 border border-border">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Export-Status
        </span>
        <StatusDot system="Moodle" status={moodleStatus} />
        <span className="text-border">·</span>
        <StatusDot system="Brian" status={brianStatus} />
      </div>
    </TooltipProvider>
  );
}

/**
 * Inline-Variante: gibt nur die beiden Dots (Moodle + Brian) ohne
 * eigenen Container/Label aus. Gedacht für die oberste Status-Zeile
 * im Detail-Panel, die schon den Freigabe-Badge enthält.
 */
export function AufgabeExportStatusInline({ aufgabe }) {
  if (!aufgabe) return null;
  const moodleStatus = resolveMoodleStatus(aufgabe);
  const brianStatus = aufgabe.brian_sync_status || 'new';
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 flex-wrap">
        <StatusDot system="Moodle" status={moodleStatus} />
        <span className="text-border">·</span>
        <StatusDot system="Brian" status={brianStatus} />
      </div>
    </TooltipProvider>
  );
}