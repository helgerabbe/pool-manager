/**
 * EinheitFinalReleaseControl.jsx
 *
 * Schritt 3 des vierstufigen Export-Workflows – jetzt im Freigabe-Cockpit
 * (Tab 9) beheimatet, weil dort der Gesamtstatus der Einheit sichtbar ist
 * und die Entscheidung „Jetzt final freigeben" getroffen wird.
 *
 * Zeigt:
 *   - Lifecycle-Status-Badge der Einheit
 *   - „x / 4 Dashboards geprüft"-Übersicht
 *   - Aktions-Button „Einheit final freigeben" (Status 'draft', 4/4 grün)
 *     bzw. „Freigabe aufheben" (Status 'final_freigegeben')
 *   - Direkthilfe (InfoHint) daneben
 *
 * Pre-Flight (preflightFinalRelease) blockiert hart, wenn jemand noch
 * aktiv in einer Aufgabe/einem Lernpaket arbeitet (Confirm-Dialog mit
 * Bearbeiter-Liste). Auch der Server-Call antwortet mit 409 + Lock-Liste.
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, Loader2, Lock, ShieldOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useEinheitFreigabeStatus } from '@/hooks/useEinheitFreigabeStatus';
import { EXPORT_LIFECYCLE_STATUS } from '@/lib/exportLifecycle';
import EinheitFreigabeConfirmDialog from '@/components/lernpfade/EinheitFreigabeConfirmDialog';
import InfoHint from '@/components/lernpfade/InfoHint';
import EinheitLifecycleInfoBox from '@/components/export/EinheitLifecycleInfoBox';

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
      title={locked ? `${label}: geprüft` : `${label}: noch in Bearbeitung`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

export default function EinheitFinalReleaseControl({ einheitId, darfFreigeben = false }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useEinheitFreigabeStatus(einheitId);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeLocks, setActiveLocks] = useState([]);

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

  const writeMutation = useMutation({
    mutationFn: async (newStatus) => {
      const res = await base44.functions.invoke('setEinheitFreigabeStatus', {
        einheitId,
        newStatus,
      });
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
      queryClient.invalidateQueries({ queryKey: ['aufgabeLock'] });
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-data', einheitId] });
      // Cockpit-Tabelle (EinheitStatusTabelle) liest den Grundzustand + Dashboard-
      // Status aus dem `einheit`-Objekt (export_lifecycle_status) und den
      // Lernpfad-Memberships ab. Diese Queries müssen ebenfalls frisch geladen
      // werden, damit "Im Export" nach dem Aufheben wieder zu "Neu" wird.
      queryClient.invalidateQueries({ queryKey: ['einheit', einheitId] });
      queryClient.invalidateQueries({ queryKey: ['lernpfadMemberships', einheitId] });
      queryClient.invalidateQueries({ queryKey: ['themenfelder'] });
      // Tab 1 & Tab 2 mergen die Einheit aus workspace-data UND der Listen-Query.
      // Die Listen-Query hält export_lifecycle_status 5 Min im Cache → ohne
      // Refetch bliebe der alte "Im Export"-Wert hängen.
      queryClient.invalidateQueries({ queryKey: ['einheiten-list-secure'] });
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
        className={`rounded-xl border p-4 space-y-3 ${
          isContentLocked ? 'border-emerald-300 bg-emerald-50/60' : 'border-border bg-card'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold">Finale Einheits-Freigabe</h3>
          <InfoHint title="Wie funktioniert die finale Freigabe?">
            Die finale Einheits-Freigabe ist erst möglich, wenn alle 4 Lerntyp-Dashboards
            geprüft sind UND aktuell niemand mehr in einer Aufgabe oder einem Lernpaket
            aktiv arbeitet. Mit der Freigabe werden die <strong>Inhalte aller Aufgaben,
            Lernpakete und Aktivitäten</strong> gesperrt – die Bearbeitungs-Tabs werden
            read-only. „Freigabe aufheben" ist möglich, solange das Export-Team noch nicht
            „Export starten" geklickt hat.
          </InfoHint>
        </div>

        {/* Dashboards linksbündig, Button rechtsbündig — auf einer Linie. */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-muted-foreground">Dashboards:</span>
            <div className="flex items-center gap-1 flex-wrap">
              {Object.entries(data.dashboards).map(([lt, locked]) => (
                <DashboardPill key={lt} label={LERNTYP_LABELS[lt]} locked={locked} />
              ))}
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">
              {data.lockedCount} / 4 geprüft
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {status === EXPORT_LIFECYCLE_STATUS.DRAFT && (
              <Button
                size="sm"
                onClick={handleOpenConfirm}
                disabled={!canEnterFinal || preflightMutation.isPending || writeMutation.isPending}
                className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white border-transparent"
                title={
                  !darfFreigeben
                    ? 'Nur Admin oder Fachschaftsleitung dürfen die Einheit final freigeben.'
                    : !data.allDashboardsLocked
                      ? 'Erst möglich, wenn alle 4 Dashboards geprüft sind.'
                      : 'Einheit final freigeben'
                }
              >
                {preflightMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
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
                className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
                title={
                  !darfFreigeben
                    ? 'Nur Admin oder Fachschaftsleitung dürfen die Freigabe aufheben.'
                    : 'Finale Einheits-Freigabe aufheben'
                }
              >
                {writeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldOff className="w-4 h-4" />
                )}
                Freigabe aufheben
              </Button>
            )}
          </div>
        </div>

        {/* Infobox: Zustand der ganzen Einheit in Klartext + Zeitstempel. */}
        <EinheitLifecycleInfoBox data={data} />
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