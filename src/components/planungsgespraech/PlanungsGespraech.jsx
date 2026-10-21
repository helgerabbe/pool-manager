import React from 'react';
import { Loader2, MessageCircle, ArrowRight, FastForward, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import VarianteKarte from './VarianteKarte';

const EGAL = 'Weiß ich nicht, entscheide du';

/** Planungsgespräch vor der Grobplanung: Assistent spiegelt, bietet 2–3 Wege an, fragt ggf. nach Material. Überspringbar. */
export default function PlanungsGespraech({ onFragen, onFertig, onZurueck }) {
  const [r, setR] = React.useState(null);
  const [laedt, setLaedt] = React.useState(false);
  const [fehler, setFehler] = React.useState('');
  const [wahl, setWahl] = React.useState(null);
  const [material, setMaterial] = React.useState('');
  const [wunsch, setWunsch] = React.useState('');

  const fragen = (w) => { setLaedt(true); setFehler(''); onFragen(w).then((e) => { setR(e); setWahl(null); setWunsch(''); }).catch(() => setFehler('Das hat nicht geklappt. Bitte noch einmal versuchen.')).finally(() => setLaedt(false)); };
  React.useEffect(() => { fragen(''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const option = r?.optionen?.find((o) => o.titel === wahl);
  const fertig = () => onFertig({ wahl: option ? `${option.titel}: ${option.kurz}` : EGAL, verlauf: option?.verlauf?.map((p) => p.name) || [], material });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Kurz besprechen, bevor ich baue</h2>
          <p className="text-sm text-muted-foreground">Du kannst später alles noch ändern. Aber so treffe ich eher, was du dir vorstellst.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onFertig(null)}><FastForward /> Überspringen, mach einfach</Button>
      </div>
      {laedt && !r && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Ich schaue mir dein Vorhaben an …</p>}
      {fehler && <p className="text-xs text-destructive">{fehler}</p>}
      {r && (
        <>
          <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <MessageCircle className="h-5 w-5 shrink-0 text-primary" />
            <div className="space-y-1 text-sm"><p>{r.verstanden}</p><p className="font-medium">{r.frage}</p></div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {r.optionen.map((o) => <VarianteKarte key={o.titel} option={o} gewaehlt={wahl === o.titel} onWaehlen={() => setWahl(o.titel)} />)}
          </div>
          <button onClick={() => setWahl(EGAL)} className={`rounded-full border px-3 py-1 text-sm ${wahl === EGAL ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>{EGAL}</button>
          {r.material_frage && (
            <div className="space-y-2 rounded-xl border bg-card p-4">
              <p className="text-sm font-medium">{r.material_frage}</p>
              <div className="flex flex-wrap gap-2">
                {(r.material_optionen || []).map((m) => (
                  <button key={m} onClick={() => setMaterial(m)} className={`rounded-full border px-3 py-1 text-sm ${material === m ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>{m}</button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Passt nicht ganz? Sag mir in deinen Worten, was du willst.</p>
            <div className="flex gap-2">
              <Textarea rows={2} value={wunsch} onChange={(e) => setWunsch(e.target.value)} placeholder="z. B. Ich will erst wiederholen und dann noch kurz was Neues zeigen." />
              <Button variant="outline" disabled={!wunsch.trim() || laedt} onClick={() => fragen(wunsch)}>{laedt ? <Loader2 className="animate-spin" /> : <Send />}</Button>
            </div>
          </div>
        </>
      )}
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onZurueck}>Zurück</Button>
        <Button disabled={!wahl} onClick={fertig}>Ja, so planen <ArrowRight /></Button>
      </div>
    </div>
  );
}