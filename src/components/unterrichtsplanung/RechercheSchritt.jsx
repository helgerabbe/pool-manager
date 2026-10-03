import React, { useEffect, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import MaterialUpload from './MaterialUpload';
import SpeechInputButton from '@/components/ui/SpeechInputButton';

/** Schritt 1: Thema, Wünsche, Material → Recherche starten. */
export default function RechercheSchritt({ planung, ue, speichern, recherche }) {
  const [thema, setThema] = useState('');
  const [vorgaben, setVorgaben] = useState('');
  const [materialien, setMaterialien] = useState([]);

  useEffect(() => {
    setThema(planung?.thema || ue?.titel || '');
    setVorgaben(planung?.vorgaben || '');
    setMaterialien(planung?.materialien || []);
  }, [planung?.id, ue?.id]);

  const laeuft = speichern.isPending || recherche.isPending;
  const starten = async () => {
    const p = await speichern.mutateAsync({ thema, vorgaben, materialien });
    recherche.mutate({ planung_id: p.id });
  };

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div>
        <h2 className="text-base font-bold">1 · Material & Recherche</h2>
        <p className="text-xs text-muted-foreground">
          Gib mir, was du hast. Ich recherchiere zusätzlich das Kerncurriculum Niedersachsen, Fachdidaktik und Studyflix
          und mache daraus eine Liste möglicher Inhalte.
        </p>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Thema</label>
        <Input value={thema} onChange={(e) => setThema(e.target.value)} placeholder="z. B. Groß- und Kleinschreibung" />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Wünsche & Klassensituation (optional)</label>
          <SpeechInputButton value={vorgaben} onResult={setVorgaben} maxSeconds={60} label="Spracheingabe" />
        </div>
        <Textarea rows={3} value={vorgaben} onChange={(e) => setVorgaben(e.target.value)} placeholder="Schwerpunkte, Vorwissen, Besonderheiten der Lerngruppe …" />
      </div>
      <MaterialUpload materialien={materialien} onChange={setMaterialien} />
      <div className="flex items-center gap-3">
        <Button onClick={starten} disabled={laeuft || !thema.trim()} className="gap-2">
          {laeuft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {planung?.inhalte?.length ? 'Neu recherchieren' : 'Recherche starten'}
        </Button>
        {recherche.isPending && <span className="text-xs text-muted-foreground">Das dauert etwa ein bis zwei Minuten …</span>}
        {planung?.inhalte?.length > 0 && !laeuft && (
          <span className="text-xs text-muted-foreground">Neu recherchieren ersetzt Inhaltsliste und Verlauf.</span>
        )}
      </div>
    </section>
  );
}