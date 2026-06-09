/**
 * InterneInhalteCard.jsx
 *
 * Export-Center-Trigger „Interne Inhalte erzeugen".
 *
 * Ruft die Backend-Funktion `generateInterneInhalte` auf, die für alle
 * KI-System-Bausteine (z. B. „Einführung in das Themenfeld") über alle vier
 * Lerntypen einmalig einen SchuelerInhaltSnapshot erzeugt — die Single Source
 * of Truth, aus der die Schüleransicht später blitzschnell liest. Bereits
 * vorhandene Snapshots werden standardmäßig übersprungen (idempotent); per
 * „Neu generieren" können sie bewusst überschrieben werden.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function InterneInhalteCard({ einheitId }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const run = async (force) => {
    setRunning(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('generateInterneInhalte', { einheitId, force });
      if (res?.data?.error) throw new Error(res.data.error);
      setResult(res.data);
      const { erzeugt = 0, uebersprungen = 0, fehler = 0 } = res.data || {};
      toast.success(`${erzeugt} erzeugt, ${uebersprungen} übersprungen${fehler ? `, ${fehler} fehlerhaft` : ''}.`);
    } catch (e) {
      toast.error(e?.message || 'Erzeugung fehlgeschlagen.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-100 text-violet-600 shrink-0">
          <Sparkles className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">Interne Inhalte erzeugen</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Erstellt einmalig alle KI-generierten Baustein-Inhalte (z. B. Einführungen)
            für die vier Lerntypen und speichert sie zentral. Schüler lesen danach
            sofort daraus — ohne Wartezeit.
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Button size="sm" className="gap-1.5" disabled={running} onClick={() => run(false)}>
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Fehlende erzeugen
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={running}
              onClick={() => run(true)}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Alle neu generieren
            </Button>
          </div>

          {result && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> {result.erzeugt} erzeugt
              </span>
              <span className="text-muted-foreground">{result.uebersprungen} übersprungen</span>
              {result.fehler > 0 && (
                <span className="inline-flex items-center gap-1 text-destructive">
                  <AlertTriangle className="w-3.5 h-3.5" /> {result.fehler} fehlerhaft
                </span>
              )}
              <span className="text-muted-foreground">({result.gesamt} gesamt)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}