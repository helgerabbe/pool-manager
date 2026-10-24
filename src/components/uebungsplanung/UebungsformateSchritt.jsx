import React from 'react';
import { ArrowLeft, ArrowRight, Loader2, Sparkles, Plus, Check, X, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const EINSATZ = { stunde: 'In der Stunde', hausaufgabe: 'Hausaufgabe', uebungszeit: 'Übungszeit' };

/** Früher Schritt: Welche inhaltsbezogenen Übungen sollen die Schüler am Ende bearbeiten? Überspringbar. */
export default function UebungsformateSchritt({ wert, setWert, onVorschlaege, laedt, onZurueck, onWeiter }) {
  const u = wert || { liste: [], vorschlaege: [] };
  const [eigen, setEigen] = React.useState('');
  const [holt, setHolt] = React.useState(false);
  const liste = u.liste || [];
  const gewaehlt = (t) => liste.some((x) => x.titel === t);
  const umschalten = (x) => setWert({ ...u, liste: gewaehlt(x.titel) ? liste.filter((y) => y.titel !== x.titel) : [...liste, x] });
  const holen = () => { setHolt(true); onVorschlaege().then((vs) => setWert({ ...u, vorschlaege: vs })).finally(() => setHolt(false)); };
  const hinzu = () => { if (!eigen.trim()) return; setWert({ ...u, liste: [...liste, { titel: eigen.trim(), eigen: true }] }); setEigen(''); };
  const weiter = (status) => onWeiter({ ...u, status });

  return (
    <div className="space-y-5">
      <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <Sparkles className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">Bevor wir über den Stundenverlauf sprechen: Was sollen die Schüler am Ende konkret bearbeiten können? Gemeint sind inhaltliche Übungen, z. B. „Dezimalzahlen der Größe nach sortieren“, nicht Methoden wie Think-Pair-Share. Du kannst das auch offenlassen oder überspringen.</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Hast du schon eine Übung im Kopf?</p>
        <div className="flex gap-2">
          <Input value={eigen} onChange={(e) => setEigen(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && hinzu()} placeholder="z. B. Aufgabe 3 aus dem Buch, Seite 42" />
          <Button variant="outline" onClick={hinzu}><Plus /> Hinzufügen</Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Vorschläge des Assistenten</p>
          <Button size="sm" variant="outline" disabled={holt} onClick={holen}>{holt ? <Loader2 className="animate-spin" /> : <Sparkles />} {u.vorschlaege?.length ? 'Neue Vorschläge' : 'Vorschläge holen'}</Button>
        </div>
        {(u.vorschlaege || []).map((x) => (
          <button key={x.titel} onClick={() => umschalten(x)} className={`w-full rounded-xl border p-3 text-left transition ${gewaehlt(x.titel) ? 'border-primary bg-primary/5' : 'bg-card hover:border-primary/40'}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold">{x.titel}</p>
              {gewaehlt(x.titel) ? <Check className="h-4 w-4 text-primary" /> : x.einsatz && <span className="text-[11px] text-muted-foreground">{EINSATZ[x.einsatz] || x.einsatz}</span>}
            </div>
            <p className="text-sm text-muted-foreground">{x.beschreibung}</p>
            {x.voraussetzung && <p className="mt-1 text-xs text-muted-foreground">Voraussetzung: {x.voraussetzung}</p>}
          </button>
        ))}
      </div>

      {liste.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-semibold">Gewählt</p>
          {liste.map((x) => (
            <div key={x.titel} className="flex items-center justify-between rounded-lg bg-muted px-3 py-1.5 text-sm">
              {x.titel}<button onClick={() => umschalten(x)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" onClick={onZurueck}><ArrowLeft /> Zurück zu den Informationen</Button>
        <div className="flex gap-2">
          <Button variant="ghost" disabled={laedt} onClick={() => weiter('uebersprungen')}><SkipForward /> Überspringen</Button>
          <Button variant="outline" disabled={laedt} onClick={() => weiter('offen')}>Noch offen lassen</Button>
          <Button disabled={laedt || !liste.length} onClick={() => weiter('gewaehlt')}><ArrowRight /> Weiter zum Planungsgespräch</Button>
        </div>
      </div>
    </div>
  );
}