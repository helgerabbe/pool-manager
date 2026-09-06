import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import { pruefeSchluessel, MINDESTDAUER_MS, MINDESTDAUER_MINUTEN } from '@/lib/brianSchluessel';

/**
 * Schlüsselcode-Eingabe am Ende einer Brian-Aufgabe.
 *
 * Ersetzt den blanken „Erledigt"-Knopf: Ohne den Code, den Brian am Ende des
 * Gesprächs nennt, geht es nicht weiter. Der Abbruch-Code führt ebenfalls
 * weiter, markiert die Aufgabe aber als nicht vollständig bearbeitet.
 *
 * War der Schüler auffällig kurz bei Brian (siehe MINDESTDAUER_MS), muss er
 * einmal zusätzlich bestätigen; das wird an den Fortschritt weitergegeben.
 */
export default function BrianSchluesselEingabe({ schluessel, geoeffnetAm, busy, onAbschluss }) {
  const [eingabe, setEingabe] = useState('');
  const [fehler, setFehler] = useState('');
  const [rueckfrage, setRueckfrage] = useState(null); // 'vollstaendig' bei Verdacht

  const zuSchnell = () => {
    if (!geoeffnetAm) return true; // Brian gar nicht von hier geöffnet
    return Date.now() - geoeffnetAm < MINDESTDAUER_MS;
  };

  const absenden = (bestaetigt = false) => {
    const art = pruefeSchluessel(eingabe, schluessel);
    if (!art) {
      setFehler('Dieser Code passt nicht. Frag Brian am Ende des Gesprächs nach dem Schlüsselcode.');
      return;
    }
    setFehler('');

    if (art === 'vollstaendig' && zuSchnell() && !bestaetigt) {
      setRueckfrage('vollstaendig');
      return;
    }

    onAbschluss?.({
      vollstaendig: art === 'vollstaendig',
      abgebrochen: art === 'abbruch',
      code_art: art,
      zu_schnell: art === 'vollstaendig' ? zuSchnell() : false,
      dauer_ms: geoeffnetAm ? Date.now() - geoeffnetAm : null,
    });
  };

  if (rueckfrage) {
    return (
      <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
        <p className="text-sm text-amber-900">
          Das ging sehr schnell — du warst weniger als {MINDESTDAUER_MINUTEN} Minuten bei Brian.
          Hast du die Aufgabe dort wirklich zusammen mit ihm bearbeitet?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => { setRueckfrage(null); setEingabe(''); }}>
            Nein, ich mache das noch
          </Button>
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={() => absenden(true)}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Ja, ich habe sie bearbeitet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <p className="text-sm font-semibold flex items-center gap-1.5">
        <KeyRound className="w-4 h-4" /> Schlüsselcode von Brian
      </p>
      <p className="text-xs text-muted-foreground">
        Brian nennt dir den Code, wenn du die Aufgabe zum Ende gebracht hast. Gib ihn hier ein, um weiterzukommen.
      </p>
      <div className="flex items-center gap-2">
        <Input
          value={eingabe}
          inputMode="numeric"
          maxLength={3}
          placeholder="z. B. 148"
          onChange={(e) => { setEingabe(e.target.value.replace(/\D/g, '')); setFehler(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') absenden(); }}
          className="w-28 text-center text-lg tracking-widest font-semibold"
        />
        <Button
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          disabled={busy || eingabe.length < 3}
          onClick={() => absenden()}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Code prüfen
        </Button>
      </div>
      {fehler && <p className="text-xs text-destructive">{fehler}</p>}
    </div>
  );
}