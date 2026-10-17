import React from 'react';
import { Input } from '@/components/ui/input';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';
import MaterialUpload from '@/components/unterrichtsplanung/MaterialUpload';

const karte = (an) => `rounded-xl border p-3 text-left transition-all ${an ? 'border-primary bg-primary/5 shadow-sm' : 'bg-card hover:border-primary/40'}`;

/** Inhaltlicher Anker: Thema aus der Einheit, eigene Beschreibung, Material – einzeln oder kombiniert. */
export default function AnkerFelder({ verlauf, anker, setAnker }) {
  const an = (s) => anker.abschnitte.some((x) => x.titel === s.titel);
  const umschalten = (s) => setAnker((a) => ({ ...a, abschnitte: an(s) ? a.abschnitte.filter((x) => x.titel !== s.titel) : [...a.abschnitte, s] }));
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-semibold">Thema aus der Einheit wählen</p>
        {verlauf.length === 0 ? (
          <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">Für diese Einheit ist noch kein Verlauf geplant. Beschreib die Stunde einfach unten.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {verlauf.map((s, i) => (
              <button key={i} onClick={() => umschalten(s)} className={karte(an(s))}>
                <p className="text-sm font-semibold">{i + 1}. {s.titel}</p>
                {s.lernziel && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.lernziel}</p>}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold">Und/oder: Worum soll es gehen? <span className="font-normal text-muted-foreground">(tippen oder einsprechen)</span></p>
        <FreitextMitSprache value={anker.text} onChange={(t) => setAnker((a) => ({ ...a, text: t }))} rows={3} placeholder="z. B. Die Schüler sollen am Text erkennen, warum manche Argumente überzeugender sind als andere." />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold">Das haben die Schüler schon gemacht <span className="font-normal text-muted-foreground">(optional)</span></p>
        <Input value={anker.vorwissen} onChange={(e) => setAnker((a) => ({ ...a, vorwissen: e.target.value }))} placeholder="z. B. Letzte Stunde: Aufbau eines Arguments kennengelernt" />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold">Und/oder: Material hochladen <span className="font-normal text-muted-foreground">(Buchseite, Aufgabenblatt, Präsentation, PDF)</span></p>
        <MaterialUpload materialien={anker.materialien} onChange={(m) => setAnker((a) => ({ ...a, materialien: m }))} />
      </div>
    </div>
  );
}