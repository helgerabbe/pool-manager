import React from 'react';
import { Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VerlaufAbschnitt from './VerlaufAbschnitt';
import ZeitbudgetFeld from './ZeitbudgetFeld';
import ZeitGewichtung from './ZeitGewichtung';

/** Schritt 4: Zeitbudget auf die Abschnitte des Verlaufs verteilen. */
export default function ZeitplanungSchritt({ planung, planen, speichern }) {
  const verlauf = planung.verlauf || [];
  const hatZeit = verlauf.some((s) => s.minuten > 0);
  const budget = (planung.einzelstunden || 0) * 40 + (planung.doppelstunden || 0) * 85;
  const summe = verlauf.reduce((a, s) => a + (s.minuten || 0), 0);
  const letzte = [...(planung.gespraech || [])].reverse().find((m) => m.role === 'assistant');
  const setzeGewicht = (index, gewichtung) =>
    speichern.mutate({ verlauf: verlauf.map((s, i) => (i === index ? { ...s, gewichtung } : s)) });

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div>
        <h2 className="text-base font-bold">4 · Zeitplanung</h2>
        <p className="text-xs text-muted-foreground">Gib an, wie viele Stunden du hast — die Zeit wird auf die Abschnitte verteilt.</p>
      </div>
      <p className="rounded-lg bg-accent/10 p-3 text-xs text-foreground/80">
        Die Zeitplanung dient nur deinem Überblick. Die Werte kannst du bei der Planung der einzelnen Stunden noch anpassen.
      </p>
      <ZeitbudgetFeld planung={planung} onSpeichern={(d) => speichern.mutate(d)} />
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/40 p-3">
        <Button onClick={() => planen.mutate({ planung_id: planung.id, modus: 'zeit' })} disabled={planen.isPending || budget === 0} size="sm" className="gap-2">
          {planen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
          {hatZeit ? 'Nach meinen Gewichtungen neu berechnen' : 'Zeit planen'}
        </Button>
        <span className="text-xs text-muted-foreground">
          {budget === 0 ? 'Bitte zuerst Stunden angeben.' : 'Kann ein bis zwei Minuten dauern.'}
        </span>
      </div>
      {hatZeit && letzte?.content && <p className="rounded-lg bg-primary/5 p-3 text-sm">{letzte.content}</p>}
      {hatZeit && <p className="text-xs text-muted-foreground">Verplant: {summe} von {budget} Min.</p>}
      <ol className="space-y-2">
        {verlauf.map((s, i) => (
          <VerlaufAbschnitt
            key={i}
            abschnitt={s}
            index={i}
            gedimmt={s.gewichtung === 'raus'}
            kopfZusatz={
              <span className="flex items-center gap-3">
                {hatZeit && <ZeitGewichtung wert={s.gewichtung} onChange={(g) => setzeGewicht(i, g)} />}
                {hatZeit && (
                  <span className="whitespace-nowrap text-right text-xs font-semibold text-primary">
                    {s.gewichtung === 'raus' ? 'deaktiviert · 0 Min.' : `${s.minuten || 0} Min.`}
                  </span>
                )}
              </span>
            }
          >
            {s.zeit_text && s.gewichtung !== 'raus' && <p className="text-xs font-medium text-primary">{s.zeit_text}</p>}
          </VerlaufAbschnitt>
        ))}
      </ol>
    </section>
  );
}