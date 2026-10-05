import React from 'react';
import { Clock } from 'lucide-react';
import { STUNDEN_MODELLE } from '@/lib/stundenModelle';

const BEDEUTUNG = {
  induktiv: 'Die Schüler entdecken eine Regel selbst: vom Phänomen über Vermutungen und deren Prüfung bis zur Formulierung. Braucht viel Zeit, schafft aber tiefes Verständnis.',
  deduktiv: 'Die Regel wird eingeführt, geklärt und dann angewendet, erst angeleitet, dann selbstständig. Zeitsparend und gut planbar.',
  uebung_kurz: 'Eine knappe Übungsphase, die Gelerntes festigt. Oft direkt im Anschluss an eine Erarbeitung.',
  uebung_mittel: 'Eine individuelle Arbeitsphase mit Rückmeldung oder Selbstkontrolle und einem Blick auf die nächsten Schritte.',
  uebung_lang: 'Eine längere, oft differenzierte Übungszeit, z. B. Stationenlernen, mit eigenem Arbeitsplan und Abschlussbilanz.',
  wiederholung: 'Vorwissen wird reaktiviert, Lücken werden bestimmt und gezielt geschlossen, bevor es weitergeht.',
  vertieft: 'Eine anspruchsvolle Teamaufgabe: Problem erschließen, Lösungen entwickeln, ein Produkt erstellen, vergleichen und reflektieren.',
  diagnose_kurz: 'Eine schnelle Erhebung des Lernstands mit kurzer Rückmeldung.',
  diagnose_mittel: 'Eine Erhebung mit transparenten Kriterien, Auswertung und Ableitung nächster Schritte.',
  diagnose_lang: 'Eine umfassende Diagnose mit mehreren Nachweisen und festgelegten Konsequenzen.',
};

/** Infoseite: das didaktische Grundmodell der Aktivitätengalerie. */
export default function DidaktischeKonzeption() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-bold">Didaktische Konzeption</h2>
        <p className="text-sm text-muted-foreground">Jede Aktivität wird danach eingeordnet, wie gut sie zu typischen Stundenmodellen passt und welche Phasen sie dort übernehmen kann.</p>
      </div>
      <div className="rounded-xl border bg-muted/40 p-4 text-sm space-y-2">
        <p><strong>Modelle sind Bausteine, keine starren Stunden.</strong> Die Modelle sind als Unterrichtsstunden gedacht. In der Praxis kommen aber oft zwei in einer Stunde vor, zum Beispiel eine deduktive Erarbeitung zu Beginn, auf die rasch eine kurze individuelle Übung folgt.</p>
        <p className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span><strong>Hauptkriterium ist die Zeit.</strong> Manche Methoden brauchen deutlich länger als andere. Wir prüfen deshalb zuerst, was in der verfügbaren Zeit überhaupt möglich ist, und erst danach, was inhaltlich am besten passt.</span></p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {STUNDEN_MODELLE.map((m) => (
          <div key={m.key} className="space-y-2 rounded-xl border bg-card p-4">
            <h3 className="font-semibold">{m.name}</h3>
            <p className="text-sm text-muted-foreground">{BEDEUTUNG[m.key]}</p>
            <ol className="space-y-1 text-sm">
              {m.phasen.map((p, i) => (
                <li key={p} className="flex gap-2"><span className="w-5 shrink-0 text-xs font-semibold text-primary">{i + 1}.</span>{p}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}