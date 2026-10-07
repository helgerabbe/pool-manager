import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Sparkles, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ABSCHNITTE } from '@/lib/fachregisterAbschnitte';
import { entwurfAusLehrwerk, didaktikRecherche } from '@/lib/fachregisterKi';
import AbschnittKarte from '@/components/fachregister/AbschnittKarte';
import LehrwerkUpload from '@/components/fachregister/LehrwerkUpload';

/** Schuleigener Arbeitsplan einer Fachregister-Einheit. */
export default function FachregisterEinheitDetail() {
  const { id } = useParams();
  const [werte, setWerte] = React.useState(null);
  const [laeuft, setLaeuft] = React.useState('');
  React.useEffect(() => { base44.entities.FachregisterEinheit.get(id).then(setWerte); }, [id]);
  if (!werte) return <Loader2 className="m-8 h-6 w-6 animate-spin" />;

  const setze = (k, v) => setWerte((w) => ({ ...w, [k]: v }));
  const speichern = async () => {
    setLaeuft('speichern');
    await base44.entities.FachregisterEinheit.update(id, Object.fromEntries(ABSCHNITTE.map((a) => [a.key, werte[a.key] || ''])));
    setLaeuft('');
    toast.success('Gespeichert.');
  };
  const dateienAendern = async (d) => { setze('lehrwerk_dateien', d); await base44.entities.FachregisterEinheit.update(id, { lehrwerk_dateien: d }); };
  const ki = async (art) => {
    setLaeuft(art);
    try {
      if (art === 'entwurf') setWerte({ ...werte, ...(await entwurfAusLehrwerk(werte)) });
      else setze('didaktik', await didaktikRecherche(werte));
      toast.success('Entwurf erstellt. Bitte prüfen und speichern.');
    } catch { toast.error('Die KI-Anfrage ist fehlgeschlagen.'); }
    setLaeuft('');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-12">
      <Link to="/fachregister" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Fachregister</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{werte.fach} · Jahrgang {werte.jahrgangsstufe} · {(werte.kurse || []).join(', ')}</p>
          <h1 className="font-display text-2xl font-bold">{werte.titel}</h1>
        </div>
        <Button onClick={speichern} disabled={!!laeuft} className="gap-2">
          {laeuft === 'speichern' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Speichern
        </Button>
      </div>
      <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
        <LehrwerkUpload dateien={werte.lehrwerk_dateien} onChange={dateienAendern} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" disabled={!!laeuft || !werte.lehrwerk_dateien?.length} onClick={() => ki('entwurf')}>
            {laeuft === 'entwurf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Entwurf aus Lehrwerk
          </Button>
          <Button variant="outline" className="gap-2" disabled={!!laeuft} onClick={() => ki('didaktik')}>
            {laeuft === 'didaktik' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} Didaktik im Internet recherchieren
          </Button>
        </div>
      </div>
      {ABSCHNITTE.map((a) => <AbschnittKarte key={a.key} abschnitt={a} wert={werte[a.key]} onChange={(v) => setze(a.key, v)} />)}
    </div>
  );
}