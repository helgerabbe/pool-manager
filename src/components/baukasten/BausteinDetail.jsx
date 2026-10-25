import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Wand2, ArrowLeft } from 'lucide-react';
import { ARTEN } from '@/lib/stundenbaukasten';
import PhasenEditor from '@/components/stundenbau/PhasenEditor';
import FolienTexte from './FolienTexte';

/** Hineingezoomt: einen Baustein mit seinen Folien bearbeiten, dann zurück zur Übersicht. */
export default function BausteinDetail({ b, kopf, startFolie, laedt, onAendern, onFuellen, onFertig, onEinfuegen }) {
  const setze = (k) => (e) => onAendern({ ...b, [k]: e.target ? e.target.value : e });
  return (
    <div className="space-y-5">
      <button onClick={onFertig} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Zurück zum Ablauf</button>
      <div className="flex flex-wrap items-end gap-3">
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ARTEN[b.art].farbe}`}>{ARTEN[b.art].label}{b.methode ? ` · ${b.methode}` : ''}</span>
        <Input value={b.titel} onChange={setze('titel')} className="max-w-sm font-display font-bold" />
        <Input value={b.minuten || ''} type="number" onChange={(e) => onAendern({ ...b, minuten: Number(e.target.value) || null })} placeholder="Min." className="w-24" title="Nur ein grober Richtwert" />
        <div className="flex rounded-lg border p-0.5 text-xs">
          {[['tafel', 'Nur Tafel'], ['geraet', 'Schüler arbeiten am Gerät']].map(([k, l]) => (
            <button key={k} onClick={() => onAendern({ ...b, geraet: k })} className={`rounded-md px-2 py-1 ${b.geraet === k ? 'bg-primary text-primary-foreground' : ''}`}>{l}</button>
          ))}
        </div>
      </div>
      <Input value={b.beschreibung || ''} onChange={setze('beschreibung')} placeholder="Was passiert in diesem Baustein?" />
      <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
        <span>{b.vorlage ? 'Das ist die Vorlage der Methode.' : b.folien.length ? 'Du kannst die Folien weiter anpassen.' : 'Noch keine Folien.'} Soll der Assistent sie mit den Inhalten dieser Stunde füllen?</span>
        <Button size="sm" className="ml-auto" onClick={onFuellen} disabled={laedt}>{laedt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} {b.art === 'methode' ? 'Mit Inhalten füllen' : 'Folie erstellen lassen'}</Button>
      </div>
      {b.folien.length > 0 && (
        <PhasenEditor key={`${b.id}${startFolie}`} stand={{ ...b }} kopf={kopf} onFolien={(folien) => onAendern({ ...b, folien })} onEinfuegen={onEinfuegen} onFertig={onFertig} onNeu={onFuellen} letztePhase />
      )}
      <FolienTexte folien={b.folien} onFolien={(folien) => onAendern({ ...b, folien })} />
    </div>
  );
}