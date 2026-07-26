/**
 * components/workspace/lernpaketWizard/WizardInhalteGenerator.jsx
 *
 * Super-Wizard Etappe 2: Generiert KI-Inhalte für die LEEREN Aktivitäten
 * eines Lernpakets — sequenziell, mit Fortschritts-/Statusanzeige pro
 * Aktivität. Nicht-destruktiv: befüllte oder freigegebene Aktivitäten
 * werden vom Backend automatisch übersprungen. Etappe 3: Für Video-/
 * Link-Aktivitäten recherchiert die KI echte Quellen im Internet
 * (bevorzugt Studyflix, URL-verifiziert); nur Datei-/Bild-Pflichtfelder
 * werden noch ausgelassen. Alle Ergebnisse bleiben im Entwurfs-Status.
 */
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, CheckCircle2, SkipForward, AlertTriangle, CircleDashed } from 'lucide-react';
import { cn } from '@/lib/utils';

const PHASE_ICON = { Input: '📚', 'Übung': '✏️', Abschluss: '🎯' };

export default function WizardInhalteGenerator({ paket, aktivitaeten = [], katalog = [], disabled = false, onBusyChange }) {
  const queryClient = useQueryClient();
  const [statuses, setStatuses] = useState({});
  const [isRunning, setIsRunning] = useState(false);

  const katalogById = new Map(katalog.map((k) => [k.id, k.name]));
  const leere = aktivitaeten.filter((a) => a.is_complete !== true && a.content_status !== 'approved');

  if (leere.length === 0) return null;

  const setStatus = (id, status) => setStatuses((prev) => ({ ...prev, [id]: status }));

  const run = async () => {
    setIsRunning(true);
    onBusyChange?.(true);
    let done = 0, skipped = 0, failed = 0;

    for (const a of leere) {
      setStatus(a.id, { state: 'running' });
      try {
        const res = await base44.functions.invoke('generateWizardAktivitaetInhalt', { activityId: a.id });
        const data = res?.data || res;
        if (data?.success) {
          done += 1;
          setStatus(a.id, { state: 'done' });
        } else if (data?.skipped) {
          skipped += 1;
          setStatus(a.id, { state: 'skipped', message: data.reason });
        } else {
          failed += 1;
          setStatus(a.id, { state: 'error', message: data?.error || 'Generierung fehlgeschlagen.' });
        }
      } catch (err) {
        console.error('[WizardInhalteGenerator] fill failed', err);
        failed += 1;
        setStatus(a.id, { state: 'error', message: err?.response?.data?.error || 'Fehler bei der Generierung.' });
      }
    }

    queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
    queryClient.invalidateQueries({ queryKey: ['workspace-data'] });
    queryClient.invalidateQueries({ queryKey: ['wizard-bestand', paket.id] });
    queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });

    if (done > 0) {
      toast.success(`${done} Aktivität${done !== 1 ? 'en' : ''} mit Inhalten befüllt (als Entwurf — bitte prüfen).`);
    }
    if (done === 0 && (skipped > 0 || failed > 0)) {
      toast.info('Keine Aktivität konnte automatisch befüllt werden — Details siehe Liste.');
    }
    setIsRunning(false);
    onBusyChange?.(false);
  };

  const statusIcon = (s) => {
    if (!s) return <CircleDashed className="w-3.5 h-3.5 text-muted-foreground/50" />;
    if (s.state === 'running') return <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />;
    if (s.state === 'done') return <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />;
    if (s.state === 'skipped') return <SkipForward className="w-3.5 h-3.5 text-amber-500" />;
    return <AlertTriangle className="w-3.5 h-3.5 text-destructive" />;
  };

  return (
    <div className="rounded-md border border-violet-200 bg-violet-50/50 px-3 py-2.5 space-y-2 text-xs">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="font-semibold text-foreground">
          Inhalte für {leere.length} leere Aktivität{leere.length !== 1 ? 'en' : ''} generieren
        </p>
        <Button
          type="button"
          size="sm"
          onClick={run}
          disabled={disabled || isRunning}
          className="gap-2 h-7 text-xs"
        >
          {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {isRunning ? 'Generiere…' : 'Inhalte generieren'}
        </Button>
      </div>

      <div className="space-y-1">
        {leere.map((a) => {
          const s = statuses[a.id];
          return (
            <div
              key={a.id}
              className={cn(
                'flex items-start gap-2 px-2 py-1 rounded border bg-background',
                s?.state === 'error' ? 'border-destructive/40' : 'border-border'
              )}
            >
              <span className="shrink-0 mt-0.5">{statusIcon(s)}</span>
              <span className="shrink-0">{PHASE_ICON[a.phase] || ''}</span>
              <div className="flex-1 min-w-0">
                <span className="text-foreground">{katalogById.get(a.aktivitaet_id) || 'Unbekannte Aktivität'}</span>
                {s?.message && (
                  <p className="text-[11px] text-muted-foreground leading-snug">{s.message}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-muted-foreground leading-snug">
        Die KI befüllt nur leere Aktivitäten — mit Inhalt oder freigegeben bleibt unangetastet. Für Video- und
        Link-Aktivitäten recherchiert die KI passende Quellen im Internet (bevorzugt Studyflix) und prüft, ob der
        Link wirklich existiert. Nur Aktivitäten mit Datei-/Bild-Pflichtfeldern werden übersprungen. Alles bleibt
        im Entwurfs-Status.
      </p>
    </div>
  );
}