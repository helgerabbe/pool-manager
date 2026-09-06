import { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Loader2, Save, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Schüler-Anzeige des System-Bausteins „Anmeldung zur schriftlichen Arbeit"
 * (sys_exam_register).
 *
 * WARUM MIT DATUM: Ein einfacher „Habe ich gemacht"-Knopf wäre kein Nachweis.
 * Der Schüler wählt seinen Termin in der Poolzeit-App (9.10) und trägt hier
 * genau dieses Datum ein. Das Datum wird gespeichert, damit er später jederzeit
 * nachsehen kann, für welchen Termin er sich angemeldet hat. Erst mit
 * gespeichertem Datum lässt sich der Baustein bestätigen.
 *
 * `demo` = Lehrer-Vorschau: alles bedienbar, es wird nichts gespeichert.
 */
export default function PruefungsAnmeldungSeite({
  meta,
  gespeichertesDatum = '',
  erledigt = false,
  busy = false,
  onSpeichern,
  onErledigt,
  demo = false,
}) {
  const [datum, setDatum] = useState(gespeichertesDatum || '');
  const [gespeichert, setGespeichert] = useState(gespeichertesDatum || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDatum(gespeichertesDatum || '');
    setGespeichert(gespeichertesDatum || '');
  }, [gespeichertesDatum]);

  const speichern = async () => {
    if (!datum) return;
    if (demo) { setGespeichert(datum); return; }
    setSaving(true);
    try {
      await onSpeichern?.(datum);
      setGespeichert(datum);
    } finally {
      setSaving(false);
    }
  };

  const datumLesbar = gespeichert
    ? new Date(`${gespeichert}T00:00:00`).toLocaleDateString('de-DE', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      })
    : '';
  const ungespeicherteAenderung = !!datum && datum !== gespeichert;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full px-5 py-6 space-y-5">
        {/* Kopf */}
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary shrink-0">
            <CalendarDays className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Anmeldung</p>
            <h1 className="text-lg font-bold text-foreground tracking-tight truncate">
              {meta?.titel || 'Anmeldung zur schriftlichen Arbeit'}
            </h1>
          </div>
        </div>

        <p className="text-sm text-foreground leading-relaxed">
          Du entscheidest selbst, an welchem der möglichen Termine du die
          schriftliche Arbeit schreibst. Dafür sind zwei Schritte nötig:
        </p>

        {/* Schritt 1 */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">1</span>
            <p className="text-sm font-semibold text-foreground">Termin in der Poolzeit-App eintragen</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed pl-8">
            Öffne deine Poolzeit-App (9.10) und trage dort unter „Schriftliche
            Arbeiten" ein, welchen Termin du nehmen möchtest.
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground pl-8">
            <Smartphone className="w-3.5 h-3.5" /> App 9.10 · Schriftliche Arbeiten
          </p>
        </div>

        {/* Schritt 2 */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">2</span>
            <p className="text-sm font-semibold text-foreground">Dein Termin hier eintragen</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed pl-8">
            Wähle genau das Datum, an dem deine schriftliche Arbeit stattfindet.
            So kannst du später jederzeit nachsehen, wofür du angemeldet bist.
          </p>
          <div className="pl-8 flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              className="w-auto"
              aria-label="Datum der schriftlichen Arbeit"
            />
            <Button
              size="sm"
              onClick={speichern}
              disabled={!datum || saving || (!ungespeicherteAenderung && !!gespeichert)}
              className="gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Termin speichern
            </Button>
          </div>
          {gespeichert && (
            <div className="pl-8">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Dein gespeicherter Termin
                </p>
                <p className="text-sm font-medium text-emerald-900">{datumLesbar}</p>
              </div>
            </div>
          )}
        </div>

        {/* Bestätigung */}
        <div className="pt-1">
          {erledigt ? (
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-600">
              <CheckCircle2 className="w-5 h-5" /> Anmeldung bestätigt
            </div>
          ) : (
            <>
              <Button
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                disabled={busy || !gespeichert || ungespeicherteAenderung}
                onClick={onErledigt}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Ich habe mich angemeldet
              </Button>
              {!gespeichert && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Trage zuerst dein Datum ein und speichere es.
                </p>
              )}
              {gespeichert && ungespeicherteAenderung && (
                <p className="text-xs text-amber-700 text-center pt-2">
                  Du hast das Datum geändert – bitte erst speichern.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}