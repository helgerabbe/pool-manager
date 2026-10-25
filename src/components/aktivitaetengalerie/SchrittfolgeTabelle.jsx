import React from 'react';
import { Loader2, Sparkles, Footprints } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { kiSchrittfolge } from '@/lib/kiSchrittfolge';
import SchrittfolgeZelle from './SchrittfolgeZelle';

/** Schrittfolge aus der Feinplanung: je Schritt Tafel und Tablet nebeneinander, bearbeitbar. */
export default function SchrittfolgeTabelle({ werte, setze }) {
  const [laeuft, setLaeuft] = React.useState(false);
  const schritte = werte.info_schrittfolge || [];
  const erstellen = async () => {
    setLaeuft(true);
    try { setze('info_schrittfolge', await kiSchrittfolge(werte)); } catch { toast.error('Die Schrittfolge konnte nicht erstellt werden.'); }
    setLaeuft(false);
  };
  const aendere = (i, p) => setze('info_schrittfolge', schritte.map((s, j) => (j === i ? { ...s, ...p } : s)));
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-2 text-sm font-medium"><Footprints className="h-4 w-4 text-primary" />Schrittfolge der Folien</p>
      <p className="text-xs text-muted-foreground">Jede Veränderung an Tafel oder Tablet ist ein Schritt. Grundlage für „Foliensatz neu bauen“.</p>
      <Button size="sm" variant="outline" className="gap-2" disabled={laeuft || !(werte.info_grafikassistent || '').trim()} onClick={erstellen}>
        {laeuft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Schrittfolge aus der Feinplanung erstellen
      </Button>
      {schritte.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs"><tr><th className="w-12 p-2">Schritt</th><th className="p-2">Tafel</th><th className="p-2">Tablet</th></tr></thead>
            <tbody>
              {schritte.map((s, i) => (
                <tr key={i} className="border-t align-top">
                  <td className="p-2 font-semibold">{i + 1}<p className="text-[10px] font-normal text-muted-foreground">{s.phase}</p></td>
                  <td className="p-2"><SchrittfolgeZelle s={s} seite="tafel" aendere={(p) => aendere(i, p)} /></td>
                  <td className="p-2"><SchrittfolgeZelle s={s} seite="tablet" aendere={(p) => aendere(i, p)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}