import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Sparkles, Loader2, Check, History, Lock, Monitor, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import useAufgabenGenerator from '@/hooks/useAufgabenGenerator';
import useSnapshotHtml from '@/hooks/useSnapshotHtml';
import GespraechsSpalte from '@/components/werkstatt/GespraechsSpalte';
import {
  fragmentZuDokument, dokumentZuFragment, pruefeFragment,
} from '@/lib/aufgabeFragment';

/**
 * AufgabenWerkstattModal
 * ──────────────────────
 * Die Werkstatt für interaktive Aufgaben ("Offene Aufgabe").
 *
 * Links das Gespräch mit der KI, rechts die laufende Schüler-Ansicht.
 * Was im Rahmen steht, ist exakt das, was die Schüler:innen später sehen —
 * darum bewusst nüchtern gerahmt und beschriftet, ohne Gerätesimulation.
 *
 * Ergebnis ist ein Fragment; beim Übernehmen wird daraus ein vollständiges
 * Dokument gemacht, damit Schüleransicht und Export unverändert weiterlaufen.
 * Beides wird an den Aufrufer übergeben: onApproveSnapshot(dokument, fragment).
 */
export default function AufgabenWerkstattModal({
  open,
  onOpenChange,
  description = '',
  kontext = '',
  catalogName = 'Offene Aufgabe',
  phase = 'Übung',
  existingSnapshotHtml = '',
  existingSnapshotUrl = '',
  canApprove = false,
  isReleased = false,
  onApproveSnapshot,
}) {
  const { html: dateiHtml } = useSnapshotHtml(open ? existingSnapshotUrl : '');
  const gespeichert = existingSnapshotHtml || dateiHtml || '';

  // Gespeicherte Stände liegen als vollständiges Dokument vor — für die
  // Weiterarbeit brauchen wir daraus wieder ein Fragment.
  const startFragment = useMemo(
    () => (gespeichert ? dokumentZuFragment(gespeichert) : ''),
    [gespeichert],
  );

  const generatorKontext = useMemo(() => ({
    beschreibung: description,
    einheit: typeof kontext === 'string' ? kontext : kontext?.einheit,
    fach: typeof kontext === 'object' ? kontext?.fach : undefined,
    jahrgangsstufe: typeof kontext === 'object' ? kontext?.jahrgangsstufe : undefined,
    lernziele: typeof kontext === 'object' ? kontext?.lernziele : undefined,
  }), [description, kontext]);

  const gen = useAufgabenGenerator({ kontext: generatorKontext, startFragment });

  const [eingabe, setEingabe] = useState('');
  const [speichert, setSpeichert] = useState(false);
  const [gespeichertHinweis, setGespeichertHinweis] = useState(false);

  // Beim Öffnen den ersten Auftrag vorbereiten, aber nicht abschicken —
  // die Lehrkraft soll ihn noch ergänzen können.
  useEffect(() => {
    if (!open) return;
    setGespeichertHinweis(false);
    setEingabe(
      gen.staende.length === 0 && description.trim()
        ? `Bau mir daraus eine interaktive Übungsaufgabe:\n\n${description.trim()}`
        : '',
    );
  }, [open]);

  const abschicken = () => {
    const t = eingabe.trim();
    if (!t || gen.busy) return;
    setEingabe('');
    setGespeichertHinweis(false);
    gen.senden(t);
  };

  const uebernehmen = async () => {
    if (!gen.fragment || !onApproveSnapshot) return;
    setSpeichert(true);
    try {
      await onApproveSnapshot(fragmentZuDokument(gen.fragment), gen.fragment);
      setGespeichertHinweis(true);
    } catch (err) {
      toast.error('Übernehmen fehlgeschlagen: ' + (err?.message || 'Unbekannter Fehler'));
    } finally {
      setSpeichert(false);
    }
  };

  const dokument = gen.fragment ? fragmentZuDokument(gen.fragment) : '';
  const hinweise = gen.fragment ? pruefeFragment(gen.fragment) : [];
  const hatAufgabe = !!gen.fragment;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[96vw] max-w-[1400px] overflow-hidden bg-slate-50 p-4">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-violet-600" />
            Aufgaben-Werkstatt
            <span className="text-xs font-normal text-slate-500 ml-1">· {catalogName}</span>
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            Beschreibe im Gespräch, was die Schüler:innen tun sollen. Rechts siehst du jederzeit,
            was dabei herauskommt — und probierst es aus wie sie.
          </p>
        </DialogHeader>

        {isReleased && (
          <div className="mt-3 flex items-start gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Diese Aufgabe ist freigegeben. Zum Weiterarbeiten hebe zuerst die Freigabe auf —
              ansehen und ausprobieren kannst du sie hier trotzdem.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,2fr)_3fr] gap-4 pt-3 min-h-0">
          <GespraechsSpalte
            gen={gen}
            eingabe={eingabe}
            onEingabe={setEingabe}
            onAbschicken={abschicken}
            disabled={isReleased}
            className="min-h-[340px] max-h-[58vh]"
          />

          {/* ── Vorschau ─────────────────────────────────────────────── */}
          <div className="flex flex-col min-h-0 gap-3">
            <div className="flex-1 min-h-[340px] rounded-xl border-2 border-slate-300 bg-white overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border-b border-slate-200 shrink-0">
                <Monitor className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-slate-600">
                  So sehen es die Schüler:innen
                </span>
                <span className="text-[11px] text-slate-400 ml-auto">{phase}</span>
              </div>
              <div className="flex-1 min-h-0 relative">
                {hatAufgabe ? (
                  <iframe
                    title="Aufgaben-Vorschau"
                    srcDoc={dokument}
                    sandbox="allow-scripts allow-same-origin"
                    className="w-full h-full border-0 bg-white"
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-2 px-8 text-center">
                    <Eye className="w-8 h-8 text-slate-300" />
                    <p className="text-sm text-slate-500">
                      Sobald die erste Fassung steht, kannst du sie hier ausprobieren.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {hinweise.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 space-y-1">
                {hinweise.map((h, i) => <p key={i}>{h}</p>)}
              </div>
            )}

            {/* Stände + Übernehmen */}
            <div className="flex flex-wrap items-center gap-2">
              {gen.staende.length > 1 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  {gen.staende.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => gen.springeZu(i)}
                      className={`rounded-md border px-2 py-1 text-xs transition ${
                        i === gen.index
                          ? 'border-violet-300 bg-violet-100 text-violet-900 font-semibold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                      title={s.zeit ? new Date(s.zeit).toLocaleTimeString('de-DE') : undefined}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}

              {gespeichertHinweis ? (
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-emerald-100 border border-emerald-300 px-3 py-1.5 text-sm font-semibold text-emerald-800">
                  <Check className="w-4 h-4" /> Übernommen und gespeichert
                </span>
              ) : (
                <Button
                  onClick={uebernehmen}
                  disabled={!hatAufgabe || !canApprove || speichert || gen.busy || isReleased}
                  className="gap-2 ml-auto"
                  title={!canApprove ? 'Zum Übernehmen den Bearbeitungsmodus aktivieren.' : ''}
                >
                  {speichert
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Wird gespeichert…</>
                    : <><Check className="w-4 h-4" /> Diesen Stand übernehmen</>}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
