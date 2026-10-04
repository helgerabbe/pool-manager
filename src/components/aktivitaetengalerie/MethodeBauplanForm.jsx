import React from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import BauplanFeld from './BauplanFeld';

const PHASEN = [['einstieg', 'Einstieg'], ['erarbeitung', 'Erarbeitung'], ['sicherung', 'Sicherung'], ['uebung', 'Übung'], ['abschluss', 'Abschluss']];

const FELDER = [
  ['kurzbeschreibung', 'Was macht diese Aktivität?', 'Ein Satz, worum es geht.'],
  ['ablauf', 'Ablauf', 'Schritt für Schritt, wie die Methode im Raum läuft.'],
  ['lehreransicht', 'Lehreransicht (Tafel)', 'Was steht in dieser Phase an der digitalen Tafel?'],
  ['schueleransicht', 'Schüleransicht (Gerät)', 'Was sehen und tun die Schüler auf ihrem Gerät? Was geben sie ein?'],
  ['pflicht_material', 'Muss vorhanden sein', 'z. B. „Ein Bild als Impuls (hochladen oder erzeugen)“ – je Punkt eine Zeile.'],
  ['optional_material', 'Kann zusätzlich genutzt werden', 'Je Punkt eine Zeile.'],
  ['analog_umsetzung', 'Analoge Umsetzung', 'Wie läuft die Methode ohne Geräte, welches Material braucht es?'],
  ['assistent_fragen', 'Fragen des Assistenten an die Lehrkraft', 'z. B. „Hast du einen Foliensatz oder sollen wir einen erstellen?“ – je Frage eine Zeile.'],
];

/** Bauplan einer Methode bearbeiten. */
export default function MethodeBauplanForm({ methode, onGespeichert }) {
  const [werte, setWerte] = React.useState(methode);
  const [speichert, setSpeichert] = React.useState(false);
  const setze = (k, v) => setWerte((w) => ({ ...w, [k]: v }));
  const phasen = werte.phasen || [];

  const speichern = async () => {
    setSpeichert(true);
    const daten = Object.fromEntries([...FELDER.map(([k]) => k), 'phasen', 'bauplan_fertig'].map((k) => [k, werte[k]]));
    await base44.entities.MethodenKatalog.update(methode.id, daten);
    setSpeichert(false);
    toast.success('Gespeichert.');
    onGespeichert();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">{methode.name}</h2>
          <p className="text-xs text-muted-foreground">Modus {methode.modus} · {methode.dauer_min || '?'}–{methode.dauer_max || '?'} Min.</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={!!werte.bauplan_fertig} onCheckedChange={(v) => setze('bauplan_fertig', v)} /> Bauplan geprüft
        </label>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">In welchen Phasen kommt sie vor?</p>
        <div className="flex flex-wrap gap-2">
          {PHASEN.map(([k, l]) => (
            <Button key={k} size="sm" variant={phasen.includes(k) ? 'default' : 'outline'}
              onClick={() => setze('phasen', phasen.includes(k) ? phasen.filter((p) => p !== k) : [...phasen, k])}>{l}</Button>
          ))}
        </div>
      </div>
      {FELDER.map(([k, titel, hilfe]) => <BauplanFeld key={k} titel={titel} hilfe={hilfe} value={werte[k] || ''} onChange={(v) => setze(k, v)} />)}
      <Button className="gap-2" disabled={speichert} onClick={speichern}>
        {speichert ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Speichern
      </Button>
    </div>
  );
}