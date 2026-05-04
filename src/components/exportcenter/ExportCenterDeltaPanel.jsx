/**
 * ExportCenterDeltaPanel.jsx
 *
 * Zone B des Export-Center-Arbeitsbereichs.
 *
 * Zeigt die Liste der Elemente, die seit dem letzten Export (re-)bearbeitet
 * oder neu angelegt wurden. Quelle für die Beurteilung:
 *   - sync_status (Lernpakete, Aktivitäten, AllgemeineAufgabe): 'new',
 *     'pending', 'modified' oder fehlend → gehört zum Delta. 'synced' →
 *     gehört NICHT zum Delta.
 *   - export_lifecycle_status === 'draft' UND keine bisherigen Exports
 *     → "Initial-Export: 100% der Daten".
 *
 * Phase G.2: schlicht und übersichtlich. Keine Selektion, kein Mutations-
 * Trigger – das passiert alles im MBK-Panel weiter unten und im
 * Abschluss-Dialog.
 */

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { GitBranch, Sparkles, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const DELTA_SYNC_STATES = new Set(['new', 'pending', 'modified', 'error', null, undefined]);

function isInDelta(item) {
  return DELTA_SYNC_STATES.has(item?.sync_status);
}

export default function ExportCenterDeltaPanel({ einheit }) {
  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete', einheit.id],
    queryFn: () => base44.entities.Lernpakete.filter({ einheit_id: einheit.id }),
    enabled: !!einheit?.id,
  });
  const { data: allgemeineAufgaben = [] } = useQuery({
    queryKey: ['allgemeineAufgaben', einheit.id],
    queryFn: () => base44.entities.AllgemeineAufgabe.filter({ einheit_id: einheit.id }),
    enabled: !!einheit?.id,
  });
  const { data: aktivitaeten = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten', einheit.id],
    queryFn: async () => {
      const lp = await base44.entities.Lernpakete.filter({ einheit_id: einheit.id });
      const ids = new Set(lp.map((p) => p.id));
      const all = await base44.entities.LernpaketPhaseAktivitaet.list();
      return all.filter((a) => ids.has(a.lernpaket_id));
    },
    enabled: !!einheit?.id,
  });

  const wasEverExported = !!einheit.export_published_at || !!einheit.last_synced_at;

  const deltaItems = useMemo(() => {
    const items = [];
    for (const lp of lernpakete) {
      if (isInDelta(lp)) {
        items.push({
          kind: 'Lernpaket',
          title: lp.titel_des_pakets || '(ohne Titel)',
          status: lp.sync_status || 'new',
        });
      }
    }
    for (const aa of allgemeineAufgaben) {
      if (isInDelta(aa)) {
        items.push({
          kind: aa.anforderungsebene === '3 - Projekt' ? 'Projektaufgabe' : 'Aufgabe',
          title: aa.titel || '(ohne Titel)',
          status: aa.sync_status || 'new',
        });
      }
    }
    for (const ak of aktivitaeten) {
      if (isInDelta(ak)) {
        items.push({
          kind: 'Aktivität',
          title: `${ak.phase || ''} – Aktivität`,
          status: ak.sync_status || 'new',
        });
      }
    }
    return items;
  }, [lernpakete, allgemeineAufgaben, aktivitaeten]);

  const isInitialExport = !wasEverExported;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-primary" />
        <h3 className="font-semibold">Delta-Analyse</h3>
        {isInitialExport ? (
          <Badge className="bg-amber-100 text-amber-800 border border-amber-300 gap-1">
            <Sparkles className="w-3 h-3" />
            Initial-Export
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            {deltaItems.length} {deltaItems.length === 1 ? 'Element' : 'Elemente'} im Delta
          </Badge>
        )}
      </div>

      {isInitialExport ? (
        <p className="text-sm text-muted-foreground">
          Diese Einheit wurde noch nie exportiert. Beim ersten Export
          werden <strong>100 %</strong> der Daten an Moodle übergeben.
        </p>
      ) : deltaItems.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Keine Änderungen seit dem letzten Export — alle Inhalte sind synchron.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border overflow-hidden">
          {deltaItems.map((it, idx) => (
            <li
              key={`${it.kind}-${idx}`}
              className="flex items-center gap-3 px-3 py-2 text-sm bg-card hover:bg-muted/30 transition-colors"
            >
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide shrink-0">
                {it.kind}
              </Badge>
              <span className="flex-1 truncate">{it.title}</span>
              {it.status === 'error' && (
                <span className="inline-flex items-center gap-1 text-xs text-destructive">
                  <AlertTriangle className="w-3 h-3" />
                  Fehler
                </span>
              )}
              <span className="text-[11px] text-muted-foreground shrink-0">
                {it.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}