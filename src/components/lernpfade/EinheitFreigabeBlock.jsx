/**
 * EinheitFreigabeBlock.jsx
 *
 * Schritt 3 des dreistufigen Freigabe-Workflows.
 *
 * Kompakter Status-Block, der oben im Lernpfad-Architekt (Tab 7) angezeigt
 * wird. Visualisiert pro Lerntyp, ob das Dashboard bereits geprüft (gesperrt)
 * ist, und stellt — sobald alle 4 grün sind — den Button „Einheit final
 * freigeben" bereit. Im finalisierten Zustand zeigt der Block stattdessen
 * den „Freigabe aufheben"-Button an (nur für Admin/Fachschaft).
 *
 * Business-Logik bewusst klein gehalten: Der Block ruft nur die Backend-
 * Function `setEinheitFreigabeStatus` auf und invalidiert die relevanten
 * Queries — alle Folgewirkungen (Read-Only in Tab 5 etc.) ergeben sich aus
 * dem geänderten `einheit_freigabe_status` der Einheit.
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, Loader2, ShieldCheck, ShieldOff, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useEinheitFreigabeStatus, EINHEIT_FREIGABE_STATUS } from '@/hooks/useEinheitFreigabeStatus';
import EinheitFreigabeConfirmDialog from '@/components/lernpfade/EinheitFreigabeConfirmDialog';
import InfoHint from '@/components/lernpfade/InfoHint';

const LERNTYP_LABELS = {
  minimalist: 'Minimalist',
  pragmatiker: 'Pragmatiker',
  ehrgeizig: 'Ehrgeizig',
  passioniert: 'Passioniert',
};

function DashboardPill({ label, locked }) {
  const Icon = locked ? CheckCircle2 : Circle;
  const cls = locked
    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
    : 'bg-slate-100 text-slate-500 border-slate-200';
  return (
    <span
      className={`inline-flex items-center gap-1 h-6 px-2 rounded-full border text-[11px] font-medium ${cls}`}
      title={locked ? `${label}: geprüft & gesperrt` : `${label}: noch in Bearbeitung`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

export default function EinheitFreigabeBlock({ einheitId, darfFreigeben = false }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useEinheitFreigabeStatus(einheitId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async (newStatus) => {
      const res = await base44.functions.invoke('setEinheitFreigabeStatus', {
        einheitId,
        newStatus,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      return res?.data;
    },
    onSuccess: (_res, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['einheitFreigabeStatus', einheitId] });
      // Tab-5-Lock-Stati neu lesen: Inhalts-Sperre hängt jetzt am
      // Einheit-Status und muss nach Lock/Unlock sofort greifen.
      queryClient.invalidateQueries({ queryKey: ['aufgabeLock'] });
      toast({
        title:
          newStatus === EINHEIT_FREIGABE_STATUS.FINAL
            ? 'Einheit final freigegeben'
            : 'Freigabe aufgehoben',
        description:
          newStatus === EINHEIT_FREIGABE_STATUS.FINAL
            ? 'Die Inhalte aller Aufgaben sind jetzt gesperrt.'
            : 'Die Inhalte können wieder bearbeitet werden.',
      });
    },
    onError: (err) => {
      toast({
        variant: 'destructive',
        title: 'Aktion fehlgeschlagen',
        description: err?.message || 'Bitte erneut versuchen.',
      });
    },
  });

  if (isLoading || !data) return null;

  const isFinal = data.status === EINHEIT_FREIGABE_STATUS.FINAL;
  const canRelease = darfFreigeben && data.allDashboardsLocked && !isFinal;
  const canUnlock = darfFreigeben && isFinal;

  return (
    <>
      <div
        className={`shrink-0 px-3 py-2 border-b border-border ${
          isFinal ? 'bg-emerald-50/60' : 'bg-card'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status-Badge */}
          <span
            className={`inline-flex items-center gap-1 h-6 px-2 rounded-full border text-[11px] font-semibold ${
              isFinal
                ? 'bg-emerald-600 text-white border-transparent'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {isFinal ? <Lock className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
            {isFinal ? 'Einheit final freigegeben' : 'Einheit in Bearbeitung'}
          </span>

          {/* Dashboard-Übersicht (4 Pills) */}
          <span className="text-[11px] text-muted-foreground ml-1">Dashboards:</span>
          <div className="flex items-center gap-1 flex-wrap">
            {Object.entries(data.dashboards).map(([lt, locked]) => (
              <DashboardPill key={lt} label={LERNTYP_LABELS[lt]} locked={locked} />
            ))}
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">
            {data.lockedCount} / 4 geprüft
          </span>

          <InfoHint title="Was passiert bei der finalen Freigabe?">
            Die finale Einheits-Freigabe ist Schritt 3 des Workflows. Sie ist erst möglich,
            wenn alle 4 Lerntyp-Dashboards geprüft (gesperrt) sind. Mit der Freigabe werden
            zusätzlich die <strong>Inhalte aller Aufgaben</strong> gesperrt – Tab 5 wird
            dann read-only. Über „Freigabe aufheben" lässt sich der Zustand wieder lösen,
            ohne dass die Dashboards selbst entsperrt werden.
          </InfoHint>

          {/* Aktions-Buttons rechts */}
          <div className="ml-auto flex items-center gap-1.5">
            {!isFinal && (
              <Button
                size="sm"
                onClick={() => setConfirmOpen(true)}
                disabled={!canRelease || mutation.isPending}
                className="gap-1.5 h-7 text-[11px] px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                title={
                  !darfFreigeben
                    ? 'Nur Admin oder Fachschaftsleitung dürfen die Einheit final freigeben.'
                    : !data.allDashboardsLocked
                      ? 'Erst möglich, wenn alle 4 Dashboards geprüft sind.'
                      : 'Einheit final freigeben'
                }
              >
                {mutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3 h-3" />
                )}
                Einheit final freigeben
              </Button>
            )}
            {isFinal && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => mutation.mutate(EINHEIT_FREIGABE_STATUS.DRAFT)}
                disabled={!canUnlock || mutation.isPending}
                className="gap-1.5 h-7 text-[11px] px-2.5 border-red-300 text-red-700 hover:bg-red-50"
                title={
                  !darfFreigeben
                    ? 'Nur Admin oder Fachschaftsleitung dürfen die Freigabe aufheben.'
                    : 'Finale Einheits-Freigabe aufheben'
                }
              >
                {mutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <ShieldOff className="w-3 h-3" />
                )}
                Freigabe aufheben
              </Button>
            )}
          </div>
        </div>

        {isFinal && data.freigegeben_by && (
          <div className="mt-1 text-[11px] text-emerald-800/80">
            Freigegeben von <strong>{data.freigegeben_by}</strong>
            {data.freigegeben_at
              ? ` am ${new Date(data.freigegeben_at).toLocaleString('de-DE')}`
              : ''}
            .
          </div>
        )}
      </div>

      <EinheitFreigabeConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        busy={mutation.isPending}
        onConfirm={() => {
          setConfirmOpen(false);
          mutation.mutate(EINHEIT_FREIGABE_STATUS.FINAL);
        }}
      />
    </>
  );
}