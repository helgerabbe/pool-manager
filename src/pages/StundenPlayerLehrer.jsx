import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import TafelAnzeige from '@/components/stundenplayer/TafelAnzeige';
import CodeTimer from '@/components/stundenplayer/CodeTimer';
import PlayerLeiste from '@/components/stundenplayer/PlayerLeiste';
import SchuelerGeraet from '@/components/stundeneditor/SchuelerGeraet';
import MaterialLeiste from '@/components/stundenplayer/MaterialLeiste';
import MaterialVorschau from '@/components/stundenplayer/MaterialVorschau';

/** Lehrer-Player: die Tafel der Stunde im Vollbild, Phase für Phase. */
export default function StundenPlayerLehrer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [index, setIndex] = React.useState(0);
  const [starts, setStarts] = React.useState({});
  const [schueler, setSchueler] = React.useState(false);
  const [regie, setRegie] = React.useState(false);
  const { data: phasen = [], isLoading } = useQuery({
    queryKey: ['stundenSequenzen', id],
    queryFn: () => base44.entities.StundenSequenz.filter({ stunde_id: id }, 'reihenfolge', 50),
  });
  const phase = phasen[index];

  const [vorschau, setVorschau] = React.useState(null);
  const gehe = (i) => { setIndex(i); setSchueler(false); setVorschau(null); };
  React.useEffect(() => {
    const taste = (e) => {
      if (e.key === 'ArrowRight' && index < phasen.length - 1) gehe(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) gehe(index - 1);
    };
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  }, [index, phasen.length]);

  if (isLoading) return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>;
  if (!phase) return <div className="p-10 text-sm text-muted-foreground">Diese Stunde hat noch keine Phasen.</div>;

  const zeigeCode = phase.freischalt_code && !phase.code_deaktiviert;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      <div className="relative flex flex-1 flex-col items-center justify-center gap-8 overflow-y-auto p-10">
        {schueler ? <SchuelerGeraet phase={phase} /> : <TafelAnzeige phase={phase} />}
        {starts[phase.id] && <CodeTimer code={zeigeCode ? phase.freischalt_code : null} minuten={phase.dauer_minuten} gestartetAm={starts[phase.id]} />}
        {vorschau && <MaterialVorschau datei={vorschau} onSchliessen={() => setVorschau(null)} />}
        {regie && (
          <aside className="absolute bottom-4 right-4 max-w-sm rounded-xl bg-white p-4 text-sm text-foreground shadow-xl">
            <button className="float-right" onClick={() => setRegie(false)}><X className="h-4 w-4" /></button>
            <p className="font-semibold">Regie</p>
            <p className="mt-1 whitespace-pre-line text-muted-foreground">{phase.lehrer_hinweis || 'Keine Regie-Hinweise.'}</p>
          </aside>
        )}
      </div>
      <MaterialLeiste materialien={phase.material_urls} onVorschau={setVorschau} />
      <PlayerLeiste
        index={index} anzahl={phasen.length} phase={phase} laeuft={!!starts[phase.id]}
        onZurueck={() => gehe(index - 1)} onWeiter={() => gehe(index + 1)}
        onStart={() => setStarts((s) => ({ ...s, [phase.id]: Date.now() }))}
        onSchueler={() => setSchueler((v) => !v)} onRegie={() => setRegie((v) => !v)}
        onBeenden={() => { document.fullscreenElement && document.exitFullscreen(); navigate(`/unterrichtsstunde/${id}`); }}
      />
    </div>
  );
}