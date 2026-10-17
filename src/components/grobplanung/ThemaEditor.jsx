import React from 'react';
import { Loader2, BookOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';

/** Thema der Stunde: KI-Formulierung als gemeinsame Arbeitsgrundlage, direkt änderbar oder per Sprache nachjustierbar. */
export default function ThemaEditor({ anker, setAnker, onVorschlag }) {
  const [laedt, setLaedt] = React.useState(false);
  const [fehler, setFehler] = React.useState(false);
  const [wunsch, setWunsch] = React.useState('');
  const setThema = (t) => setAnker((a) => ({ ...a, thema: t }));
  const neu = (korrektur) => {
    setLaedt(true); setFehler(false);
    onVorschlag(anker.thema || '', korrektur)
      .then((r) => { setThema(r.thema); setWunsch(''); })
      .catch(() => setFehler(true)).finally(() => setLaedt(false));
  };
  React.useEffect(() => { if (!anker.thema) neu(); }, []);
  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <Sparkles className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">Wir wissen ja jetzt schon ungefähr, worum es gehen soll. Hier kannst du das Thema noch etwas ausschärfen oder in eine andere Richtung lenken. Auch hier geht es nicht um Perfektion: Wichtig ist nur, dass wir beide klar vor Augen haben, was die Schüler in der Stunde machen. Das ist unsere gemeinsame Arbeitsgrundlage.</p>
      </div>
      <div className="space-y-2 rounded-xl border border-accent/40 bg-accent/5 p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-accent"><BookOpen className="h-4 w-4" /> Thema der Stunde</p>
        {laedt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Textarea rows={3} value={anker.thema || ''} onChange={(e) => setThema(e.target.value)} className="bg-card" />}
        {fehler && <p className="text-xs text-destructive">Kein Vorschlag möglich. <button className="underline" onClick={() => neu()}>Noch einmal</button></p>}
      </div>
      <div className="space-y-2">
        <FreitextMitSprache value={wunsch} onChange={setWunsch} rows={2} placeholder="Konkretisieren, z. B. „Bitte mehr in Richtung Alltagsbeispiele.“" />
        <Button size="sm" variant="outline" disabled={!wunsch.trim() || laedt} onClick={() => neu(wunsch.trim())}>Thema anpassen</Button>
      </div>
    </div>
  );
}