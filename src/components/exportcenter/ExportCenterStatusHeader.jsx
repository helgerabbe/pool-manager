/**
 * ExportCenterStatusHeader.jsx
 *
 * Zone A des Export-Center-Arbeitsbereichs. Zeigt:
 *   - Titel + Metadaten der Einheit (Fach, Jahrgang, Themenfelder/Pakete)
 *   - Lifecycle-Status-Badge (groß)
 *   - Button "Export beendet & Freigeben" – öffnet den zwei-stufigen
 *     ExportCompletionDialog, der erfolgreiche/fehlerhafte Items markiert
 *     und die Einheit anschließend wieder auf 'draft' setzt.
 *
 * Der Button wird nur aktiv, wenn die Einheit gerade tatsächlich
 * exportiert wird (export_lifecycle_status === 'export_running' oder
 * 'final_freigegeben'). In allen anderen States wäre der Klick
 * verwirrend, weil noch gar nichts zum Bestätigen da ist.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Clock, Send, Pencil, Layers, Database, RefreshCw, AlertTriangle } from 'lucide-react';
import moment from 'moment';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  EXPORT_LIFECYCLE_STATUS,
  EXPORT_LIFECYCLE_LABELS,
} from '@/lib/exportLifecycle';
import ExportCompletionDialog from '@/components/exportcenter/ExportCompletionDialog';

const STRATEGY_LABELS = {
  no_reset: 'Update ohne Reset',
  full_reset: 'Mit Reset – Schüler starten neu',
};

const STATUS_META = {
  [EXPORT_LIFECYCLE_STATUS.DRAFT]: { icon: Pencil, cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  [EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN]: { icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  [EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING]: { icon: Clock, cls: 'bg-orange-100 text-orange-800 border-orange-300' },
  [EXPORT_LIFECYCLE_STATUS.PUBLISHED]: { icon: Send, cls: 'bg-blue-100 text-blue-800 border-blue-300' },
};

export default function ExportCenterStatusHeader({ einheit }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const queryClient = useQueryClient();

  const overrideMutation = useMutation({
    mutationFn: async (newStrategy) => {
      await base44.entities.Einheiten.update(einheit.id, {
        update_strategy_override: newStrategy,
        update_strategy_override_by: (await base44.auth.me())?.email || 'unknown',
        update_strategy_override_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['einheit', einheit.id] });
      setOverrideOpen(false);
    },
  });

  // Strukturzahlen (klein, nur für Zusammenfassung).
  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder', einheit.id],
    queryFn: () => base44.entities.Themenfeld.filter({ einheit_id: einheit.id }),
    enabled: !!einheit?.id,
  });
  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete', einheit.id],
    queryFn: () => base44.entities.Lernpakete.filter({ einheit_id: einheit.id }),
    enabled: !!einheit?.id,
  });

  const status = einheit.export_lifecycle_status || EXPORT_LIFECYCLE_STATUS.DRAFT;
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;

  const formatTs = (iso) => {
    if (!iso) return null;
    const m = moment(iso);
    if (!m.isValid()) return null;
    const now = moment();
    if (m.isSame(now, 'day')) return `Heute, ${m.format('HH:mm')} Uhr`;
    if (m.isSame(now.clone().subtract(1, 'day'), 'day')) return `Gestern, ${m.format('HH:mm')} Uhr`;
    return m.format('DD.MM.YYYY, HH:mm') + ' Uhr';
  };

  const lastExportTs = formatTs(einheit.last_exported_at);
  const lastPublishedTs = formatTs(einheit.export_published_at);

  // "Export beendet" macht nur Sinn, wenn der Spezialist den Export auch
  // tatsächlich gestartet bzw. die Einheit final freigegeben hat.
  const canComplete =
    status === EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING ||
    status === EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold tracking-tight">
            {einheit.titel_der_einheit}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {einheit.fach} · Jahrgangsstufe {einheit.jahrgangsstufe}
          </p>
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              {themenfelder.length} Themenfeld{themenfelder.length !== 1 ? 'er' : ''}
            </span>
            <span>·</span>
            <span>
              {lernpakete.length} Lernpaket{lernpakete.length !== 1 ? 'e' : ''}
            </span>
          </div>
        </div>
        <Badge className={cn('text-xs gap-1.5 border px-3 py-1', meta.cls)}>
          <StatusIcon className="w-3.5 h-3.5" />
          {EXPORT_LIFECYCLE_LABELS[status]}
        </Badge>
      </div>

      {/* Update-Strategie (nur bei bereits veröffentlichter Einheit mit Delta) */}
      {(einheit.update_strategy || einheit.update_strategy_empfehlung) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="text-xs font-semibold text-amber-900">Update-Strategie</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
            {einheit.update_strategy_empfehlung && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                App-Empfehlung:{' '}
                <Badge className={cn(
                  'text-[10px] h-5 px-1.5',
                  einheit.update_strategy_empfehlung === 'full_reset'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                )}>
                  {STRATEGY_LABELS[einheit.update_strategy_empfehlung]}
                </Badge>
              </span>
            )}
            {einheit.update_strategy && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                Fachschaftsleitung:{' '}
                <Badge className={cn(
                  'text-[10px] h-5 px-1.5',
                  einheit.update_strategy === 'full_reset'
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                )}>
                  {STRATEGY_LABELS[einheit.update_strategy]}
                </Badge>
                {einheit.update_strategy_set_by && (
                  <span className="text-muted-foreground">· {einheit.update_strategy_set_by}</span>
                )}
              </span>
            )}
            {einheit.update_strategy_override && (
              <span className="inline-flex items-center gap-1 text-orange-700">
                <AlertTriangle className="w-3 h-3" />
                Export-Center-Override:{' '}
                <Badge className={cn(
                  'text-[10px] h-5 px-1.5',
                  einheit.update_strategy_override === 'full_reset'
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                )}>
                  {STRATEGY_LABELS[einheit.update_strategy_override]}
                </Badge>
              </span>
            )}
          </div>
          {/* Aktive Strategie (effektiv) */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-foreground">
              Effektiv:{' '}
              <Badge className={cn(
                'text-[10px] h-5 px-1.5',
                (einheit.update_strategy_override || einheit.update_strategy) === 'full_reset'
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              )}>
                {STRATEGY_LABELS[einheit.update_strategy_override || einheit.update_strategy || 'no_reset']}
              </Badge>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOverrideOpen(!overrideOpen)}
              className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
            >
              {overrideOpen ? 'Abbrechen' : 'Überschreiben'}
            </Button>
          </div>
          {overrideOpen && (
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => overrideMutation.mutate('no_reset')}
                disabled={overrideMutation.isPending}
                className="h-7 text-[11px] px-2.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Update ohne Reset
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => overrideMutation.mutate('full_reset')}
                disabled={overrideMutation.isPending}
                className="h-7 text-[11px] px-2.5 border-red-300 text-red-700 hover:bg-red-50"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reset erzwingen
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Zeitstempel: Supabase-Export und Export-Abschluss */}
      {(lastExportTs || lastPublishedTs) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          {lastExportTs && (
            <span className="inline-flex items-center gap-1">
              <Database className="w-3 h-3" />
              Letzter Supabase-Export: <span className="font-medium text-foreground">{lastExportTs}</span>
            </span>
          )}
          {lastPublishedTs && (
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Export beendet &amp; freigegeben: <span className="font-medium text-foreground">{lastPublishedTs}</span>
            </span>
          )}
        </div>
      )}

      <div className="pt-3 border-t border-border flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground max-w-md">
          Nach erfolgreicher Übertragung in Moodle bestätigst du hier den
          Abschluss. Die Einheit wird wieder zur Bearbeitung freigegeben.
        </p>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button
            onClick={() => setDialogOpen(true)}
            disabled={!canComplete}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            title={
              canComplete
                ? 'Export-Abschluss bestätigen'
                : 'Erst möglich, sobald die Einheit final freigegeben oder im Export ist.'
            }
          >
            <CheckCircle2 className="w-4 h-4" />
            Export beendet & Freigeben
          </Button>
        </div>
      </div>

      <ExportCompletionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        einheit={einheit}
      />
    </div>
  );
}