import React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';
import MaterialUpload from '@/components/unterrichtsplanung/MaterialUpload';

const karte = (an) => `rounded-xl border p-3 text-left transition-all ${an ? 'border-primary bg-primary/5 shadow-sm' : 'bg-card hover:border-primary/40'}`;

const Moeglichkeit = ({ nr, titel, erledigt, children }) => (
  <div className={`rounded-xl border-2 p-4 ${erledigt ? 'border-primary bg-primary/5' : 'border-dashed bg-card'}`}>
    <div className="mb-3 flex items-center gap-2">
      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${erledigt ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{erledigt ? <Check className="h-4 w-4" /> : nr}</span>
      <p className="text-sm font-semibold">Möglichkeit {nr}: {titel}</p>
    </div>
    {children}
  </div>
);

const Und = () => <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">und / oder</p>;

/** Inhaltlicher Anker: drei Möglichkeiten (Thema, Beschreibung, Material) – einzeln oder kombiniert. */
export default function AnkerFelder({ verlauf, anker, setAnker }) {
  const an = (s) => anker.abschnitte.some((x) => x.titel === s.titel);
  const umschalten = (s) => setAnker((a) => ({ ...a, abschnitte: an(s) ? a.abschnitte.filter((x) => x.titel !== s.titel) : [...a.abschnitte, s] }));
  return (
    <div className="space-y-3">
      <Moeglichkeit nr={1} titel="Thema aus der Einheit wählen" erledigt={anker.abschnitte.length > 0}>
        <details className="group" open={anker.abschnitte.length > 0}>
          <summary className="flex cursor-pointer list-none items-center gap-1 text-xs text-primary">
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /> Themen anzeigen
            {anker.abschnitte.length > 0 && <span>({anker.abschnitte.length} gewählt)</span>}
          </summary>
          {verlauf.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">Für diese Einheit ist noch kein Verlauf geplant. Nutze einfach Möglichkeit 2 oder 3.</p>
          ) : (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {verlauf.map((s, i) => (
                <button key={i} onClick={() => umschalten(s)} className={karte(an(s))}>
                  <p className="text-sm font-semibold">{i + 1}. {s.titel}</p>
                  {s.lernziel && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.lernziel}</p>}
                </button>
              ))}
            </div>
          )}
        </details>
      </Moeglichkeit>
      <Und />
      <Moeglichkeit nr={2} titel="Beschreiben, worum es gehen soll" erledigt={!!anker.text.trim()}>
        <FreitextMitSprache value={anker.text} onChange={(t) => setAnker((a) => ({ ...a, text: t }))} rows={3} placeholder="Tippen oder einsprechen, z. B. Die Schüler sollen am Text erkennen, warum manche Argumente überzeugender sind als andere." />
      </Moeglichkeit>
      <Und />
      <Moeglichkeit nr={3} titel="Material hochladen" erledigt={anker.materialien.length > 0}>
        <p className="text-xs text-muted-foreground">Du kannst mehrere Dateien auf einmal hochladen. Es muss nicht alles sein: Weitere Materialien kannst du später in der Grobplanung im Bereich „Materialien“ ergänzen.</p>
        <MaterialUpload materialien={anker.materialien} onChange={(m) => setAnker((a) => ({ ...a, materialien: m }))} />
      </Moeglichkeit>
      <div className="space-y-2 pt-3">
        <p className="text-sm font-semibold">Das haben die Schüler schon gemacht <span className="font-normal text-muted-foreground">(optional)</span></p>
        <FreitextMitSprache value={anker.vorwissen} onChange={(t) => setAnker((a) => ({ ...a, vorwissen: t }))} rows={2} placeholder="z. B. Letzte Stunde: Aufbau eines Arguments kennengelernt" />
      </div>
    </div>
  );
}