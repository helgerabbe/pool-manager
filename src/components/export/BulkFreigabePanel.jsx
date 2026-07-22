/**
 * BulkFreigabePanel.jsx
 *
 * Sammel-Freigabe im Freigabe-Cockpit (2026-07-22):
 * Prüft per Backend (bulkReleaseCompleteSecure) alle Inhalte der Einheit auf
 * Vollständigkeit — mit denselben Regeln wie der einzelne Freigabe-Toggle —
 * und gibt alle vollständigen Elemente auf einen Klick frei.
 *
 * Typischer Anwendungsfall: Eine private Einheit wurde zur Poolzeit-Einheit
 * gemacht (alle Freigaben wurden dabei zurückgesetzt) und die
 * Fachschaftsleitung will die geprüften Inhalte gesammelt freigeben.
 */

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Loader2, ListChecks } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_LABEL = {
  activity: 'Aktivität',
  allgemeine_aufgabe: 'Aufgabe',
  lernpaket: 'Lernpaket',
};

export default function BulkFreigabePanel({ einheitId, einheit, darfFreigeben }) {
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [result, setResult] = useState(null);

  const isLocked = ['final_freigegeben', 'export_running', 'published'].includes(
    einheit?.export_lifecycle_status
  );

  if (!darfFreigeben || isLocked) return null;

  const refreshQueries = () => {
    ['lernpakete', 'lernpaketPhaseAktivitaeten', 'allgemeineAufgaben'].forEach((key) =>
      queryClient.invalidateQueries({ queryKey: [key] })
    );
    queryClient.invalidateQueries({ queryKey: ['workspace-data', einheitId] });
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      const res = await base44.functions.invoke('bulkReleaseCompleteSecure', {
        einheit_id: einheitId,
        action: 'check',
      });
      setResult(res.data);
    } catch (err) {
      toast.error('Prüfung fehlgeschlagen: ' + (err?.response?.data?.error || err.message));
    } finally {
      setChecking(false);
    }
  };

  const handleRelease = async () => {
    setReleasing(true);
    try {
      const res = await base44.functions.invoke('bulkReleaseCompleteSecure', {
        einheit_id: einheitId,
        action: 'release',
      });
      const { releasedCount = 0, errors = [] } = res.data || {};
      toast.success(`${releasedCount} Element${releasedCount === 1 ? '' : 'e'} freigegeben.`);
      if (errors.length > 0) {
        toast.error(`${errors.length} Element(e) konnten nicht freigegeben werden.`);
      }
      setResult(null);
      refreshQueries();
    } catch (err) {
      toast.error('Sammel-Freigabe fehlgeschlagen: ' + (err?.response?.data?.error || err.message));
    } finally {
      setReleasing(false);
    }
  };

  const freigebbar = result?.freigebbar || [];
  const unvollstaendig = result?.unvollstaendig || [];

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-primary" />
            Sammel-Freigabe
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Prüft alle Aufgaben, Aktivitäten und Lernpakete dieser Einheit auf Vollständigkeit
            und gibt vollständige Elemente auf einen Klick frei.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleCheck} disabled={checking || releasing} className="gap-1.5">
          {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ListChecks className="w-3.5 h-3.5" />}
          Vollständigkeit prüfen
        </Button>
      </div>

      {result && (
        <div className="space-y-3 pt-1">
          {/* Freigebbare Elemente */}
          <div className="rounded-md border border-green-200 bg-green-50 p-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm font-semibold text-green-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-700" />
                {freigebbar.length} Element{freigebbar.length === 1 ? '' : 'e'} vollständig und freigebbar
                {result.bereitsFreigegeben > 0 && (
                  <span className="font-normal text-green-800/80">
                    · {result.bereitsFreigegeben} bereits freigegeben
                  </span>
                )}
              </p>
              {freigebbar.length > 0 && (
                <Button size="sm" onClick={handleRelease} disabled={releasing} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
                  {releasing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Alle {freigebbar.length} jetzt freigeben
                </Button>
              )}
            </div>
            {freigebbar.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-green-800 cursor-pointer hover:underline">Liste anzeigen</summary>
                <ul className="mt-1.5 space-y-0.5">
                  {freigebbar.map((f) => (
                    <li key={f.id} className="text-xs text-green-800 flex items-start gap-1.5">
                      <span className="mt-1 w-1 h-1 rounded-full bg-green-600 shrink-0" />
                      <span><span className="font-medium">{TYPE_LABEL[f.type]}:</span> {f.titel}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          {/* Unvollständige Elemente */}
          {unvollstaendig.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-700" />
                {unvollstaendig.length} Element{unvollstaendig.length === 1 ? '' : 'e'} noch unvollständig
              </p>
              <details className="mt-2" open={unvollstaendig.length <= 5}>
                <summary className="text-xs text-amber-800 cursor-pointer hover:underline">Details anzeigen</summary>
                <ul className="mt-1.5 space-y-1">
                  {unvollstaendig.map((f) => (
                    <li key={f.id} className="text-xs text-amber-800">
                      <span className="font-medium">{TYPE_LABEL[f.type]}: {f.titel}</span>
                      {Array.isArray(f.missing) && f.missing.length > 0 && (
                        <span className="text-amber-700"> — {f.missing.map((m) => m.reason || m.label || m.fieldName).join('; ')}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}

          {freigebbar.length === 0 && unvollstaendig.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Alle Inhalte dieser Einheit sind bereits freigegeben.
            </p>
          )}
        </div>
      )}
    </div>
  );
}