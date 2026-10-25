import React from 'react';
import { Loader2, Sparkles, ListChecks, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CI_STANDARDFOLIEN } from '@/lib/folienCIStandard';
import { kiFolienliste } from '@/lib/kiFolienliste';

const StandardWahl = ({ value, onChange }) => (
  <select className="w-full rounded border bg-background px-1 text-xs" value={value || ''} onChange={(e) => onChange(e.target.value)}>
    <option value="">keine Standardfolie</option>
    {Object.entries(CI_STANDARDFOLIEN).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
  </select>
);

/** Feste Folienliste aus der Grobübersicht: verbindliche Grundlage für Feinplanung und Schrittfolge. */
export default function FolienlisteTabelle({ werte, setze }) {
  const [laeuft, setLaeuft] = React.useState(false);
  const liste = werte.info_folienliste || [];
  const setzeListe = (l) => setze('info_folienliste', l);
  const aendere = (i, p) => setzeListe(liste.map((f, j) => (j === i ? { ...f, ...p } : f)));
  const uebernehmen = async () => {
    setLaeuft(true);
    try { setzeListe(await kiFolienliste(werte)); } catch { toast.error('Die Folienliste konnte nicht übernommen werden.'); }
    setLaeuft(false);
  };
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-2 text-sm font-medium"><ListChecks className="h-4 w-4 text-primary" />Folienliste (verbindlich)</p>
      <p className="text-xs text-muted-foreground">Eine Zeile je Folie. Feinplanung und Schrittfolge halten sich genau an diese Liste.</p>
      <Button size="sm" variant="outline" className="gap-2" disabled={laeuft || !(werte.info_grobuebersicht || '').trim()} onClick={uebernehmen}>
        {laeuft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Folienliste aus der Grobübersicht übernehmen
      </Button>
      {liste.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs"><tr><th className="w-10 p-2">Nr.</th><th className="p-2">Folie</th><th className="p-2">Phase</th><th className="p-2">Standard Tafel</th><th className="p-2">Standard Tablet</th><th className="p-2">nur digital</th><th /></tr></thead>
            <tbody>
              {liste.map((f, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2 font-semibold">{i + 1}</td>
                  <td className="p-2"><input className="w-full rounded border bg-background px-1 text-xs" value={f.name || ''} onChange={(e) => aendere(i, { name: e.target.value })} /></td>
                  <td className="p-2"><input className="w-full rounded border bg-background px-1 text-xs" value={f.phase || ''} onChange={(e) => aendere(i, { phase: e.target.value })} /></td>
                  <td className="p-2"><StandardWahl value={f.tafel_standard} onChange={(v) => aendere(i, { tafel_standard: v })} /></td>
                  <td className="p-2"><StandardWahl value={f.tablet_standard} onChange={(v) => aendere(i, { tablet_standard: v })} /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={!!f.nur_digital} onChange={(e) => aendere(i, { nur_digital: e.target.checked })} /></td>
                  <td className="p-2"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setzeListe(liste.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {liste.length > 0 && <Button size="sm" variant="ghost" className="gap-1" onClick={() => setzeListe([...liste, { name: '', phase: '' }])}><Plus className="h-4 w-4" /> Folie hinzufügen</Button>}
    </div>
  );
}