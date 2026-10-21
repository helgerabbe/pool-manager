import React from 'react';
import { Loader2, Sparkles, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** KI-Erstvorschlag für ein Textfeld und Überarbeitung im Dialog (Methodenbeschreiber bzw. Grafikassistent). */
export default function GrafikAnweisungAssistent({ werte, setze, feld, erzeugen, hinweis, platzhalter, gesperrt, knopf }) {
  const [laedt, setLaedt] = React.useState(false);
  const [wunsch, setWunsch] = React.useState('');
  const [verlauf, setVerlauf] = React.useState([]);
  const [fehler, setFehler] = React.useState('');
  const bisher = werte[feld] || '';

  const lauf = (w) => {
    setLaedt(true); setFehler('');
    erzeugen({ methode: werte, bisher: w ? bisher : '', wunsch: w, verlauf: w ? verlauf.map((v) => v.wunsch) : [] })
      .then((r) => {
        setze(feld, r.text || bisher);
        setVerlauf(w ? [...verlauf, { wunsch: w, antwort: r.kurz }] : [{ wunsch: 'Erstvorschlag', antwort: r.kurz }]);
        setWunsch('');
      })
      .catch(() => setFehler('Das hat nicht geklappt. Bitte noch einmal versuchen.'))
      .finally(() => setLaedt(false));
  };

  return (
    <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="flex-1 text-xs text-muted-foreground">{hinweis}</p>
        <Button size="sm" variant="outline" disabled={laedt || gesperrt} onClick={() => lauf('')}>
          {laedt && !wunsch ? <Loader2 className="animate-spin" /> : <Sparkles />} {knopf && !bisher ? knopf : 'Bereich neu befüllen'}
        </Button>
      </div>
      {verlauf.map((v, i) => (
        <p key={i} className="text-xs"><span className="font-medium">{v.wunsch}:</span> <span className="text-muted-foreground">{v.antwort}</span></p>
      ))}
      {bisher && (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (wunsch.trim()) lauf(wunsch.trim()); }}>
          <Input value={wunsch} onChange={(e) => setWunsch(e.target.value)} placeholder={platzhalter} disabled={laedt} />
          <Button size="icon" type="submit" disabled={laedt || !wunsch.trim()}>{laedt && wunsch ? <Loader2 className="animate-spin" /> : <Send />}</Button>
        </form>
      )}
      {fehler && <p className="text-xs text-destructive">{fehler}</p>}
    </div>
  );
}