import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import ProtoStart from '@/components/stundenplanerPrototyp/ProtoStart';
import ProtoKlaeren from '@/components/stundenplanerPrototyp/ProtoKlaeren';
import ProtoEntwurf from '@/components/stundenplanerPrototyp/ProtoEntwurf';
import ProtoVorbereitung from '@/components/stundenplanerPrototyp/ProtoVorbereitung';
import ProtoUmsetzung from '@/components/stundenplanerPrototyp/ProtoUmsetzung';
import { FASSUNGEN } from '@/lib/stundenplanerPrototypDaten';

const SCHRITTE = ['Stunde wählen', 'Klären', 'Entwurf', 'Vorbereitung', 'Umsetzung'];

/** PROTOTYP (2026-10-15): geführter Stundenplaner, klickbar mit Beispieldaten, ohne KI und Speicherung. */
export default function StundenplanerVorschau() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [schritt, setSchritt] = React.useState(0);
  const [wahl, setWahl] = React.useState(null);
  const [minuten, setMinuten] = React.useState(40);
  const [entwuerfe, setEntwuerfe] = React.useState(null);
  const [aktiv, setAktiv] = React.useState('standard');
  const [routine, setRoutine] = React.useState('');

  const entwerfen = () => {
    setSchritt(2); setEntwuerfe(null);
    setTimeout(() => setEntwuerfe({ standard: FASSUNGEN.standard.phasen.map((x) => ({ ...x })) }), 1200);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <button onClick={() => navigate(`/unterrichtseinheit/${id}/struktur`)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Zurück</button>
        <div>
          <h1 className="font-display text-2xl font-bold">Neue Stunde planen</h1>
          <p className="text-xs text-accent">Prototyp mit Beispielinhalten – nichts wird gespeichert.</p>
        </div>
        <div className="flex gap-1">
          {SCHRITTE.map((s, i) => (
            <button key={s} disabled={i > schritt || (i >= 2 && !entwuerfe)} onClick={() => setSchritt(i)} className="flex-1 text-left disabled:cursor-default">
              <div className={`h-1 rounded-full ${i <= schritt ? 'bg-primary' : 'bg-muted'}`} />
              <p className={`mt-1 text-[11px] ${i === schritt ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{s}</p>
            </button>
          ))}
        </div>
        <section className="rounded-2xl border bg-card/50 p-6">
          {schritt === 0 && <ProtoStart wahl={wahl} setWahl={setWahl} minuten={minuten} setMinuten={setMinuten} onWeiter={() => setSchritt(1)} />}
          {schritt === 1 && <ProtoKlaeren onFertig={entwerfen} />}
          {schritt === 2 && !entwuerfe && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Ich erstelle einen gut machbaren Standardentwurf …</p>}
          {schritt === 2 && entwuerfe && <ProtoEntwurf entwuerfe={entwuerfe} setEntwuerfe={setEntwuerfe} aktiv={aktiv} setAktiv={setAktiv} routine={routine} setRoutine={setRoutine} onWeiter={() => setSchritt(3)} />}
          {schritt === 3 && <ProtoVorbereitung aktiv={aktiv} onZurueck={() => setSchritt(2)} onWeiter={() => setSchritt(4)} />}
          {schritt === 4 && <ProtoUmsetzung phasen={entwuerfe[aktiv]} />}
        </section>
      </div>
    </div>
  );
}