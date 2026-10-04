import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Monitor, Tablet, Play } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import PhasenLeiste from '@/components/stundeneditor/PhasenLeiste';
import TafelEditor from '@/components/stundeneditor/TafelEditor';
import SchuelerAnsichtEditor from '@/components/stundeneditor/SchuelerAnsichtEditor';

/** WYSIWYG-Editor einer Stunde: links der Verlauf, rechts Lehrer- oder Schüleransicht der Phase. */
export default function StundenEditor() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [aktivId, setAktivId] = React.useState(null);
  const [ansicht, setAnsicht] = React.useState('lehrer');
  const { data: stunde } = useQuery({ queryKey: ['unterrichtsstunde', id], queryFn: () => base44.entities.Unterrichtsstunde.get(id) });
  const { data: phasen = [], isLoading } = useQuery({
    queryKey: ['stundenSequenzen', id],
    queryFn: () => base44.entities.StundenSequenz.filter({ stunde_id: id }, 'reihenfolge', 50),
  });
  const phase = phasen.find((p) => p.id === aktivId) || phasen[0];
  const speichern = async (daten) => {
    await base44.entities.StundenSequenz.update(phase.id, daten);
    qc.invalidateQueries({ queryKey: ['stundenSequenzen', id] });
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <Link to="/unterricht" className="flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Zurück zu Mein Unterricht</Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold">{stunde?.arbeitstitel || 'Stunde'} · Editor</h1>
          <Button asChild className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to={`/unterrichtsstunde/${id}/start`}><Play className="h-4 w-4" /> Stunde jetzt starten</Link>
          </Button>
        </div>
        {!phase ? (
          <p className="text-sm text-muted-foreground">Diese Stunde hat noch keine Phasen.</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-[16rem_1fr]">
            <PhasenLeiste phasen={phasen} aktivId={phase.id} onWahl={setAktivId} />
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{phase.phasenname} {phase.dauer_minuten ? <span className="text-sm font-normal text-muted-foreground">· {phase.dauer_minuten} Min.</span> : null}</p>
                <div className="flex rounded-lg border p-0.5">
                  <Button size="sm" variant={ansicht === 'lehrer' ? 'default' : 'ghost'} className="gap-1.5" onClick={() => setAnsicht('lehrer')}><Monitor className="h-4 w-4" /> Lehreransicht</Button>
                  <Button size="sm" variant={ansicht === 'schueler' ? 'default' : 'ghost'} className="gap-1.5" onClick={() => setAnsicht('schueler')}><Tablet className="h-4 w-4" /> Schüleransicht zeigen</Button>
                </div>
              </div>
              {ansicht === 'lehrer'
                ? <TafelEditor phase={phase} onSpeichern={(tafel) => speichern({ tafel })} />
                : <SchuelerAnsichtEditor phase={phase} stundeId={id} onSpeichern={(t) => speichern({ schueler_anweisung: t })} />}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}