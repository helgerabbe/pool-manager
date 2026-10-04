import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Textarea } from '@/components/ui/textarea';
import { istDigitalerTyp } from '@/lib/stundenPhasen';
import StundenDigitalSeite from '@/components/unterrichtsstunden/schueler/StundenDigitalSeite';
import StundenAnalogSeite from '@/components/unterrichtsstunden/schueler/StundenAnalogSeite';

/** Schüleransicht: genau das, was die Schüler über Moodle sehen – Anweisung direkt bearbeitbar. */
export default function SchuelerAnsichtEditor({ phase, stundeId, onSpeichern }) {
  const [text, setText] = React.useState(phase.schueler_anweisung || '');
  React.useEffect(() => { setText(phase.schueler_anweisung || ''); }, [phase.id]);
  const { data: katalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalogAlle'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list('name', 200),
    staleTime: 10 * 60 * 1000,
  });
  const vorschau = { ...phase, schueler_anweisung: text };
  const nix = () => {};

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Anweisung auf dem Schülergerät</p>
        <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} onBlur={() => text !== (phase.schueler_anweisung || '') && onSpeichern(text)} />
      </div>
      <div className="mx-auto h-[32rem] max-w-md overflow-hidden rounded-[2rem] border-8 border-slate-800 bg-background">
        {istDigitalerTyp(phase.typ)
          ? <StundenDigitalSeite key={phase.id} phase={vorschau} kat={katalog.find((k) => k.id === phase.aktivitaet_id)} onWeiter={nix} onZurueck={nix} />
          : <StundenAnalogSeite key={phase.id} phase={vorschau} onWeiter={nix} onZurueck={nix} />}
      </div>
      <Link to={`/unterrichtsstunde/${stundeId}?tab=regieblatt`} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
        <Pencil className="h-3.5 w-3.5" /> Aufgabe oder Material dieser Phase im Regieblatt bearbeiten
      </Link>
    </div>
  );
}