import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FUNKTIONEN, ELEMENT_FUNKTIONEN } from '@/lib/folienFunktionen';

const feld = 'text-xs font-medium text-muted-foreground';

/** Funktion der Interaktion wählen und die dazu nötigen Angaben machen. */
export default function FunktionWahl({ el, setze }) {
  const moeglich = ELEMENT_FUNKTIONEN[el.typ] || [];
  const wert = moeglich.includes(el.funktion) ? el.funktion : moeglich[0];
  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <p className="text-sm font-semibold">Funktion der Interaktion</p>
      <div className="space-y-1">
        {moeglich.map((k) => (
          <button key={k} type="button" onClick={() => setze({ funktion: k })}
            className={`w-full rounded-md border px-2 py-1.5 text-left text-sm ${wert === k ? 'border-primary bg-primary/5' : 'border-border'}`}>
            <span className="font-medium">{FUNKTIONEN[k].label}</span>
            <span className="block text-xs text-muted-foreground">{FUNKTIONEN[k].text}</span>
          </button>
        ))}
      </div>
      {wert === 'uebung' && <div className="space-y-1"><p className={feld}>Lösung</p><Textarea rows={2} value={el.loesung || ''} onChange={(e) => setze({ loesung: e.target.value })} placeholder="Richtige Antwort(en)" /></div>}
      {wert === 'praesentation' && <p className="text-xs text-muted-foreground">Die Lehrkraft kann einzelne Eingaben vorne zeigen.</p>}
      {(wert === 'weiter_allein' || wert === 'weiter_gruppe') && <div className="space-y-1"><p className={feld}>Wohin geht die Eingabe?</p><Input value={el.ziel || ''} onChange={(e) => setze({ ziel: e.target.value })} placeholder={wert === 'weiter_gruppe' ? 'z. B. Folie 4, Partner vergleichen' : 'z. B. Folie 5, eigene Folgeaufgabe'} /></div>}
      {(wert === 'weiter_gruppe' || wert === 'kollaboration') && <div className="space-y-1"><p className={feld}>Gruppenkennung</p><Input value={el.gruppe || ''} onChange={(e) => setze({ gruppe: e.target.value })} placeholder="z. B. Paar, Tisch, Klasse" /></div>}
    </div>
  );
}