import React from 'react';
import { Loader2, Sparkles, MessageSquareHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';
import { kiWuenscheStrukturieren } from '@/lib/kiGrobuebersicht';

/** Eigene Wünsche der Lehrkraft zum Foliensatz: frei sprechen, dann strukturiert darstellen und nacharbeiten. */
export default function WuenscheFeld({ werte, setze }) {
  const [laedt, setLaedt] = React.useState(false);
  const [fehler, setFehler] = React.useState('');
  const roh = werte.info_wuensche_roh || '';

  const strukturieren = () => {
    setLaedt(true); setFehler('');
    kiWuenscheStrukturieren(roh)
      .then((t) => setze('info_wuensche', t))
      .catch(() => setFehler('Das hat nicht geklappt. Bitte noch einmal versuchen.'))
      .finally(() => setLaedt(false));
  };

  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-2 text-sm font-medium"><MessageSquareHeart className="h-4 w-4 text-primary" />Was mir beim Foliensatz wichtig ist</p>
      <FreitextMitSprache rows={4} value={roh} onChange={(v) => setze('info_wuensche_roh', v)}
        placeholder="z. B. Der Arbeitsauftrag soll getrennt von der Rückmeldung der Schüler stehen …" />
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={laedt || !roh.trim()} onClick={strukturieren}>
          {laedt ? <Loader2 className="animate-spin" /> : <Sparkles />} Strukturiert darstellen
        </Button>
        <p className="text-xs text-muted-foreground">Fließt in den Methodenbeschreiber und alle folgenden Schritte ein.</p>
      </div>
      {fehler && <p className="text-xs text-destructive">{fehler}</p>}
      {werte.info_wuensche !== undefined && werte.info_wuensche !== '' && (
        <Textarea rows={6} value={werte.info_wuensche} onChange={(e) => setze('info_wuensche', e.target.value)} />
      )}
    </div>
  );
}