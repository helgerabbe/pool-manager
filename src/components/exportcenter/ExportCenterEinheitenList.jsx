/**
 * ExportCenterEinheitenList.jsx
 *
 * Master-Liste aller Einheiten im Export-Center (linke Spalte).
 *
 * Pro Eintrag:
 *   - Titel der Einheit + Fach
 *   - Lifecycle-Status-Badge (final_freigegeben / export_running / published / draft)
 *   - Letzter Export (Zeitstempel) – falls vorhanden
 *   - Drift-Hinweis: zählt Sektoren mit drift_status='drifted' im
 *     getLernpfadDriftReport (per Einheit aggregiert).
 *
 * Filter: Schnellsuche nach Name oder Fach.
 *
 * Phase G.2 — pure Display-Komponente. Drift-Aggregation erfolgt LAZY
 * pro Einheit über useLernpfadDriftReport, damit die Master-Liste auch
 * bei vielen Einheiten performant bleibt (nur die ausgewählte oder
 * sichtbare Einheit wird tatsächlich abgefragt). Für die anderen
 * Einheiten reicht der Lifecycle-Status als Sortier-/Filterhinweis.
 */

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Send, AlertTriangle, CheckCircle2, Clock, Pencil, Sparkles, RefreshCw, Archive } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  EXPORT_LIFECYCLE_STATUS,
  EXPORT_LIFECYCLE_LABELS,
} from '@/lib/exportLifecycle';
import { useEinheitenMoodleSyncStatus } from '@/hooks/useEinheitenMoodleSyncStatus';

// Visuelle Map für den Moodle-Sync-Status (zweites Badge je Einheit).
const SYNC_STATUS_META = {
  new: {
    icon: Sparkles,
    label: 'Neu',
    cls: 'bg-blue-100 text-blue-800 border-blue-300',
    title: 'Diese Einheit wurde noch nie nach Moodle exportiert.',
  },
  in_sync: {
    icon: CheckCircle2,
    label: 'In Sync',
    cls: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    title: 'Letzter Moodle-Export ist aktuell — keine Änderungen seither.',
  },
  out_of_sync: {
    icon: RefreshCw,
    label: 'Out of Sync',
    cls: 'bg-amber-100 text-amber-800 border-amber-300',
    title: 'Seit dem letzten Moodle-Export wurde im Pool-Manager etwas geändert.',
  },
};

// Visuelle Map für die vier Lifecycle-States.
const STATUS_META = {
  [EXPORT_LIFECYCLE_STATUS.DRAFT]: {
    icon: Pencil,
    cls: 'bg-slate-100 text-slate-700 border-slate-300',
  },
  [EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN]: {
    icon: CheckCircle2,
    cls: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  [EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING]: {
    icon: Clock,
    cls: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  [EXPORT_LIFECYCLE_STATUS.PUBLISHED]: {
    icon: Send,
    cls: 'bg-blue-100 text-blue-800 border-blue-300',
  },
};

function formatLastExport(iso) {
  if (!iso) return null;
  try {
    return format(new Date(iso), 'dd.MM.yyyy', { locale: de });
  } catch {
    return null;
  }
}

export default function ExportCenterEinheitenList({ selectedEinheitId, onSelect }) {
  const [query, setQuery] = useState('');

  const { data: einheiten = [], isLoading } = useQuery({
    queryKey: ['einheiten', 'all'],
    queryFn: () => base44.entities.Einheiten.list('-updated_date'),
  });

  // Nur Einheiten anzeigen, die wirklich Kandidaten für einen Export sind.
  // wizard_status === 'aktiv' filtert reine Wizard-Drafts heraus.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return einheiten
      .filter((e) => e.wizard_status === 'aktiv')
      .filter((e) => {
        if (!q) return true;
        return (
          e.titel_der_einheit?.toLowerCase().includes(q) ||
          e.fach?.toLowerCase().includes(q)
        );
      });
  }, [einheiten, query]);

  // Moodle-Sync-Status pro Einheit (new / in_sync / out_of_sync).
  const syncStatusMap = useEinheitenMoodleSyncStatus(filtered);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Suche */}
      <div className="shrink-0 p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Einheit oder Fach suchen…"
            className="pl-8 h-8 text-sm"
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {filtered.length} Einheit{filtered.length !== 1 ? 'en' : ''}
        </p>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-sm text-muted-foreground">Lade Einheiten…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground italic">
            Keine Einheiten gefunden.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((e) => {
              const meta =
                STATUS_META[e.export_lifecycle_status] ||
                STATUS_META[EXPORT_LIFECYCLE_STATUS.DRAFT];
              const StatusIcon = meta.icon;
              const isSelected = e.id === selectedEinheitId;
              const lastExport = formatLastExport(e.last_synced_at || e.export_published_at);

              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(e.id)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 flex flex-col gap-1 transition-colors',
                      isSelected
                        ? 'bg-primary/10 border-l-4 border-l-primary'
                        : 'hover:bg-muted/50 border-l-4 border-l-transparent'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                          {e.ist_basismodul && (
                            <span className="inline-flex items-center gap-0.5 shrink-0 text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-300 rounded px-1 py-0.5">
                              <Archive className="w-3 h-3" /> Basis
                            </span>
                          )}
                          {e.titel_der_einheit}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {e.fach} · Jg. {e.jahrgangsstufe}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge className={cn('text-[10px] gap-1 border', meta.cls)}>
                        <StatusIcon className="w-3 h-3" />
                        {EXPORT_LIFECYCLE_LABELS[
                          e.export_lifecycle_status || EXPORT_LIFECYCLE_STATUS.DRAFT
                        ] || 'Entwurf'}
                      </Badge>
                      {(() => {
                        const syncStatus = syncStatusMap.get(e.id) || 'new';
                        const sMeta = SYNC_STATUS_META[syncStatus];
                        const SIcon = sMeta.icon;
                        return (
                          <Badge
                            className={cn('text-[10px] gap-1 border', sMeta.cls)}
                            title={sMeta.title}
                          >
                            <SIcon className="w-3 h-3" />
                            {sMeta.label}
                          </Badge>
                        );
                      })()}
                      {lastExport && (
                        <span className="text-[10px] text-muted-foreground">
                          zuletzt: {lastExport}
                        </span>
                      )}
                      {/* Erst wenn der Spezialist auf eine Einheit klickt,
                          lädt der Arbeitsbereich rechts den Drift-Report.
                          Falls in Zukunft pre-aggregierte Drift-Counter im
                          Listings-Endpoint verfügbar werden, wandern sie
                          hier rein. */}
                      {e.export_lifecycle_status === EXPORT_LIFECYCLE_STATUS.PUBLISHED && (
                        <span
                          className="inline-flex items-center gap-0.5 text-[10px] text-amber-700"
                          title="Drift-Status wird beim Auswählen geprüft."
                        >
                          <AlertTriangle className="w-3 h-3" />
                          prüfen
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}