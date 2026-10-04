import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FreitextMitSprache from './FreitextMitSprache';

const SCHWERPUNKTE = ['erarbeitung', 'uebung', 'vertiefung', 'sicherung', 'ueberpruefung'];
const LABEL = { erarbeitung: 'Erarbeitung', uebung: 'Übung', vertiefung: 'Vertiefung', sicherung: 'Sicherung', ueberpruefung: 'Überprüfung' };

/** Freie Stunde: Thema, Ziel und Schwerpunkt selbst festlegen. */
export default function FreieStunde({ onWeiter, onZurueck }) {
  const [titel, setTitel] = React.useState('');
  const [lernziel, setLernziel] = React.useState('');
  const [schwerpunkt, setSchwerpunkt] = React.useState('erarbeitung');
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Worum geht es in der Stunde?</p>
      <Input value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="Thema, z. B. Satz des Pythagoras entdecken" />
      <FreitextMitSprache value={lernziel} onChange={setLernziel} placeholder="Was sollen die Schüler am Ende können?" />
      <div className="flex flex-wrap gap-2">
        {SCHWERPUNKTE.map((s) => (
          <Button key={s} size="sm" variant={schwerpunkt === s ? 'default' : 'outline'} onClick={() => setSchwerpunkt(s)}>{LABEL[s]}</Button>
        ))}
      </div>
      <div className="flex gap-2">
        {onZurueck && <Button variant="ghost" onClick={onZurueck}>Zurück</Button>}
        <Button disabled={!titel.trim()} onClick={() => onWeiter({ titel: titel.trim(), lernziel: lernziel.trim(), schwerpunkt, frei: true })}>Weiter</Button>
      </div>
    </div>
  );
}