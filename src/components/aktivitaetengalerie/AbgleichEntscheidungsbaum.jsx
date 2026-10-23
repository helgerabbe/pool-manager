import React from 'react';
import { GitCompare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import AbgleichVorschlag from './AbgleichVorschlag';
import { kiAbgleich } from '@/lib/kiAbgleich';

const TITEL = { assistent_fragen: 'Entscheidungsbaum des Assistenten', pruefregeln: 'Prüfregeln für den Assistenten' };

/** Abgleich der Grobübersicht mit Entscheidungsbaum und Prüfregeln. */
export default function AbgleichEntscheidungsbaum({ werte, setze }) {
  const [laeuft, setLaeuft] = React.useState(false);
  const [ergebnis, setErgebnis] = React.useState(null);
  const weg = (k) => setErgebnis((e) => { const n = { ...e }; delete n[k]; return Object.keys(n).length ? n : null; });

  const starten = async () => {
    setLaeuft(true);
    setErgebnis(null);
    try {
      setErgebnis(await kiAbgleich(werte));
    } catch (e) {
      toast.error('Der Abgleich ist fehlgeschlagen. Bitte noch einmal versuchen.');
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" className="gap-2" disabled={laeuft || !(werte.foliensatz_status_quo ? werte.info_grafikassistent : werte.info_grobuebersicht || '').trim()} onClick={starten}>
        {laeuft ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />}
        Abgleich mit dem Entscheidungsbaum und den Prüfregeln
      </Button>
      {laeuft && <p className="text-xs text-muted-foreground">Ich vergleiche Foliensatz, Entscheidungsbaum und Prüfregeln …</p>}
      {ergebnis && Object.keys(TITEL).filter((k) => ergebnis[k]).map((k) => (
        <AbgleichVorschlag key={k} titel={TITEL[k]} vorschlag={ergebnis[k]}
          onUebernehmen={() => { setze(k, ergebnis[k].neuer_text || ''); weg(k); toast.success('Übernommen. Bitte noch speichern.'); }}
          onVerwerfen={() => weg(k)} />
      ))}
    </div>
  );
}