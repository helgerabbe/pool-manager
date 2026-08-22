/**
 * ExportCenterStatusHeader.jsx
 *
 * Zone A des Export-Center-Arbeitsbereichs. Zeigt:
 *   - Titel + Metadaten der Einheit (Fach, Jahrgang, Themenfelder/Pakete)
 *   - Update-Strategie (falls gesetzt)
 *
 * Der frühere Lifecycle-Teil (Status-Badge, "Export beendet & Freigeben")
 * ist entfallen: Der Export ist entkoppelt und jederzeit möglich.
 * Die Zeitstempel (letzte Bearbeitung / letzter Export) zeigt
 * ExportContentTimestamp.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Layers, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STRATEGY_LABELS = {
  no_reset: 'Update ohne Reset',
  full_reset: 'Mit Reset – Schüler starten neu',
};

export default function ExportCenterStatusHeader({ einheit }) {
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

    </div>
  );
}