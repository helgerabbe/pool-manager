import React from 'react';
import { Loader2, Target, ArrowUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';
import { STUNDENTYPEN } from '@/lib/kiGrobplanung';

/** Grobes Stundenziel mit KI-Vorschlag, Alternativen, Nachjustieren per Sprache – und optionalem Stundentyp. */
export default function ZielEditor({ ziel, setZiel, onVorschlag }) {
  const [laedt, setLaedt] = React.useState(false);
  const [fehler, setFehler] = React.useState(false);
  const [wunsch, setWunsch] = React.useState('');
  const neu = (korrektur) => {
    setLaedt(true); setFehler(false);
    onVorschlag(ziel, korrektur)
      .then((z) => { setZiel((a) => ({ ...a, haupt: z.haupt, alternativen: z.alternativen, vonKi: true })); setWunsch(''); })
      .catch(() => setFehler(true)).finally(() => setLaedt(false));
  };
  React.useEffect(() => { if (!ziel.haupt) neu(); }, []);
  const zumHaupt = (a) => setZiel((z) => ({ ...z, haupt: a, vonKi: false, alternativen: [z.haupt, ...z.alternativen.filter((x) => x !== a)] }));
  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <Sparkles className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">Entspann dich, wir machen das hier erst mal nur ganz grob. Das Ziel muss noch nicht fachdidaktisch perfekt sein. Es geht nur darum, dass wir beide verstehen, was in der Stunde passieren soll, damit wir eine gemeinsame Arbeitsgrundlage haben. Ausschärfen können wir es später noch.</p>
      </div>
      <label className="block space-y-1 text-sm">
        <span className="font-semibold">Was für eine Stunde wird es? <span className="font-normal text-muted-foreground">(optional)</span></span>
        <select value={ziel.stundentyp} onChange={(e) => setZiel((z) => ({ ...z, stundentyp: e.target.value }))} className="w-full rounded-md border bg-card px-2 py-2">
          {STUNDENTYPEN.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
        </select>
      </label>
      <div className="space-y-2 rounded-xl border border-chart-3/40 bg-chart-3/10 p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-chart-3"><Target className="h-4 w-4" /> Grobe Zielrichtung</p>
        {laedt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Textarea rows={2} value={ziel.haupt} onChange={(e) => setZiel((z) => ({ ...z, haupt: e.target.value, vonKi: false }))} className="bg-card" />}
        {fehler && <p className="text-xs text-destructive">Kein Vorschlag möglich. <button className="underline" onClick={() => neu()}>Noch einmal</button></p>}
      </div>
      {ziel.alternativen.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-xs text-primary">Andere Akzente ansehen</summary>
          <div className="mt-2 space-y-2">
            {ziel.alternativen.map((a) => (
              <div key={a} className="flex items-center gap-2 rounded-lg border p-2"><span className="flex-1">{a}</span><Button size="sm" variant="ghost" onClick={() => zumHaupt(a)}><ArrowUp /> Übernehmen</Button></div>
            ))}
          </div>
        </details>
      )}
      <div className="space-y-2">
        <FreitextMitSprache value={wunsch} onChange={setWunsch} rows={2} placeholder="Nachjustieren, z. B. „Es soll eher ums Anwenden gehen.“" />
        <Button size="sm" variant="outline" disabled={!wunsch.trim() || laedt} onClick={() => neu(wunsch.trim())}>Ziel anpassen</Button>
      </div>
    </div>
  );
}