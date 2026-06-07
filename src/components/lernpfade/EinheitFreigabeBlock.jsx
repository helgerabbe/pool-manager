/**
 * EinheitFreigabeBlock.jsx
 *
 * Schritt 3 des vierstufigen Export-Workflows.
 *
 * Kompakter Status-Block oben im Lernpfad-Architekt (Tab 7). Zeigt:
 *  - Status-Badge der Einheit (export_lifecycle_status).
 *  - Übersicht der vier Dashboard-Pills (geprüft / nicht geprüft).
 *  - Aktions-Buttons rechts:
 *      • „Einheit final freigeben"  (im Status 'draft' aktiv, sobald 4/4 grün)
 *      • „Freigabe aufheben"        (im Status 'final_freigegeben' aktiv;
 *                                    nicht mehr nach 'export_running')
 *
 * Pre-Flight (Phase B): vor dem Final-Release läuft `preflightFinalRelease`.
 * Findet er aktive Bearbeitungs-Locks, zeigt der Confirm-Dialog die
 * Bearbeiter-Liste und blockiert hart. Auch der eigentliche Server-Call
 * antwortet mit 409 + Lock-Liste — beide Pfade landen im selben UI-State.
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, Loader2, ShieldCheck, ShieldOff, Lock, Truck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useEinheitFreigabeStatus } from '@/hooks/useEinheitFreigabeStatus';
import {
  EXPORT_LIFECYCLE_STATUS,
  EXPORT_LIFECYCLE_LABELS,
} from '@/lib/exportLifecycle';
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

function StatusBadge({ status }) {
  const label = EXPORT_LIFECYCLE_LABELS[status] || EXPORT_LIFECYCLE_LABELS.draft;
  const cls =
    status === EXPORT_LIFECYCLE_STATUS.PUBLISHED
      ? 'bg-blue-600 text-white border-transparent'
      : status === EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING
        ? 'bg-orange-500 text-white border-transparent'
        : status === EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN
          ? 'bg-emerald-600 text-white border-transparent'
          : 'bg-slate-100 text-slate-700 border-slate-200';
  const Icon =
    status === EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING
      ? Truck
      : status === EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN ||
          status === EXPORT_LIFECYCLE_STATUS.PUBLISHED
        ? Lock
        : ShieldOff;
  return (
    <span
      className={`inline-flex items-center gap-1 h-6 px-2 rounded-full border text-[11px] font-semibold ${cls}`}
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
  const [activeLocks, setActiveLocks] = useState([]);

  // Pre-Flight (Lese-Endpoint, idempotent).
  const preflightMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('preflightFinalRelease', { einheitId });
      if (res?.data?.error) throw new Error(res.data.error);
      return res?.data;
    },
    onSuccess: (result) => {
      setActiveLocks(result?.activeLocks || []);
      setConfirmOpen(true);
    },
    onError: (err) => {
      toast({
        variant: 'destructive',
        title: 'Pre-Flight fehlgeschlagen',
        description: err?.message || 'Bitte erneut versuchen.',
      });
    },
  });

  // Schreib-Aktion (Lock/Unlock).
  const writeMutation = useMutation({
    mutationFn: async (newStatus) => {
      const res = await base44.functions.invoke('setEinheitFreigabeStatus', {
        einheitId,
        newStatus,
      });
      // Backend liefert 409 mit JSON-Body (code='ACTIVE_LOCKS' u. a.).
      if (res?.data?.error) {
        const err = new Error(res.data.error);
        err.code = res.data.code;
        err.activeLocks = res.data.activeLocks;
        throw err;
      }
      return res?.data;
    },
    onSuccess: (_res, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['einheitFreigabeStatus', einheitId] });
      // Inhalts-Sperre der Aufgaben hängt jetzt an export_lifecycle_status.
      queryClient.invalidateQueries({ queryKey: ['aufgabeLock'] });
      // Lebenszyklus-Badges (sync_status 'neu' → 'Im Export') aktualisieren:
      // betrifft Lernpakete, Aktivitäten, Aufgaben und die Workspace-Daten.
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-data', einheitId] });
      setConfirmOpen(false);
      setActiveLocks([]);
      toast({
        title:
          newStatus === EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN
            ? 'Einheit final freigegeben'
            : 'Freigabe aufgehoben',
        description:
          newStatus === EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN
            ? 'Die Inhalte aller Aufgaben sind jetzt gesperrt.'
            : 'Die Inhalte können wieder bearbeitet werden.',
      });
    },
    onError: (err) => {
      // Hard-Block-Fall: Server hat Live-Edits gefunden → in den Dialog überführen.
      if (err.code === 'ACTIVE_LOCKS' && Array.isArray(err.activeLocks)) {
        setActiveLocks(err.activeLocks);
        setConfirmOpen(true);
        return;
      }
      toast({
        variant: 'destructive',
        title: 'Aktion fehlgeschlagen',
        description: err?.message || 'Bitte erneut versuchen.',
      });
    },
  });

  if (isLoading || !data) return null;

  const status = data.status;
  const isFinal = data.isFinal;
  const isContentLocked = data.isContentLocked;
  const canEnterFinal =
    darfFreigeben &&
    status === EXPORT_LIFECYCLE_STATUS.DRAFT &&
    data.allDashboardsLocked;
  const canUndo = darfFreigeben && data.canUndoInUnit;

  const handleOpenConfirm = () => {
    setActiveLocks([]);
    preflightMutation.mutate();
  };

  return (
    <>
      <div
        className={`shrink-0 px-3 py-2 border-b border-border ${
          isContentLocked ? 'bg-emerald-50/60' : 'bg-card'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={status} />

          <span className="text-[11px] text-muted-foreground ml-1">Dashboards:</span>
          <div className="flex items-center gap-1 flex-wrap">
            {Object.entries(data.dashboards).map(([lt, locked]) => (
              <DashboardPill key={lt} label={LERNTYP_LABELS[lt]} locked={locked} />
            ))}
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">
            {data.lockedCount} / 4 geprüft
          </span>

          <InfoHint title="Wie funktioniert die finale Freigabe?">
            Die finale Einheits-Freigabe ist erst möglich, wenn alle 4 Lerntyp-Dashboards
            geprüft sind UND aktuell niemand mehr in einer Aufgabe oder einem Lernpaket
            aktiv arbeitet. Mit der Freigabe werden die <strong>Inhalte aller Aufgaben,
            Lernpakete und Aktivitäten</strong> gesperrt – Tabs 3, 4, 5 und 6 werden
            read-only. „Freigabe aufheben" ist möglich, solange das Export-Team noch nicht
            „Export starten" geklickt hat.
          </InfoHint>

          <div className="ml-auto flex items-center gap-1.5">
            {status === EXPORT_LIFECYCLE_STATUS.DRAFT && (
              <Button
                size="sm"
                onClick={handleOpenConfirm}
                disabled={!canEnterFinal || preflightMutation.isPending || writeMutation.isPending}
                className="gap-1.5 h-7 text-[11px] px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                title={
                  !darfFreigeben
                    ? 'Nur Admin oder Fachschaftsleitung dürfen die Einheit final freigeben.'
                    : !data.allDashboardsLocked
                      ? 'Erst möglich, wenn alle 4 Dashboards geprüft sind.'
                      : 'Einheit final freigeben'
                }
              >
                {preflightMutation.isPending ? (
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
                onClick={() => writeMutation.mutate(EXPORT_LIFECYCLE_STATUS.DRAFT)}
                disabled={!canUndo || writeMutation.isPending}
                className="gap-1.5 h-7 text-[11px] px-2.5 border-red-300 text-red-700 hover:bg-red-50"
                title={
                  !darfFreigeben
                    ? 'Nur Admin oder Fachschaftsleitung dürfen die Freigabe aufheben.'
                    : 'Finale Einheits-Freigabe aufheben'
                }
              >
                {writeMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <ShieldOff className="w-3 h-3" />
                )}
                Freigabe aufheben
              </Button>
            )}
            {status === EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING && (
              <span
                className="text-[11px] text-orange-700 italic max-w-[28rem] text-right"
                title="Das Moodle-Team hat die Einheit für den Export gesperrt. Bitte mit dem Export-Team Kontakt aufnehmen, falls noch Korrekturen nötig sind."
              >
                🔒 Diese Einheit wird gerade nach Moodle exportiert. Die
                Freigabe kann nicht aufgehoben werden — bitte mit dem
                Moodle-Team Kontakt aufnehmen.
              </span>
            )}
            {status === EXPORT_LIFECYCLE_STATUS.PUBLISHED && (
              <span className="text-[11px] text-muted-foreground italic">
                Bereits in Moodle veröffentlicht — Aufhebung nur über das Export-Center.
              </span>
            )}
          </div>
        </div>

        {(isFinal || isContentLocked) && data.changed_by && (
          <div className="mt-1 text-[11px] text-emerald-800/80">
            Freigegeben von <strong>{data.changed_by}</strong>
            {data.changed_at
              ? ` am ${new Date(data.changed_at).toLocaleString('de-DE')}`
              : ''}
            .
          </div>
        )}
      </div>

      <EinheitFreigabeConfirmDialog
        open={confirmOpen}
        onOpenChange={(v) => {
          setConfirmOpen(v);
          if (!v) setActiveLocks([]);
        }}
        busy={writeMutation.isPending}
        preflightBusy={preflightMutation.isPending}
        activeLocks={activeLocks}
        onRecheck={() => preflightMutation.mutate()}
        onConfirm={() => writeMutation.mutate(EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN)}
      />
    </>
  );
}