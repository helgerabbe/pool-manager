import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import ProtoStart from '@/components/stundenplanerPrototyp/ProtoStart';
import ProtoInhaltsanalyse from '@/components/stundenplanerPrototyp/ProtoInhaltsanalyse';
import ProtoStundenziel from '@/components/stundenplanerPrototyp/ProtoStundenziel';
import ProtoLerngruppe from '@/components/stundenplanerPrototyp/ProtoLerngruppe';
import ProtoEntwurf from '@/components/stundenplanerPrototyp/ProtoEntwurf';
import ProtoVorbereitung from '@/components/stundenplanerPrototyp/ProtoVorbereitung';
import ProtoUmsetzung from '@/components/stundenplanerPrototyp/ProtoUmsetzung';
import { FASSUNGEN, ZIELE, alsEntwurf } from '@/lib/stundenplanerPrototypDaten';

const SCHRITTE = ['Stunde', 'Inhalt', 'Ziel', 'Lerngruppe', 'Entwurf', 'Vorbereitung', 'Umsetzung'];

/** PROTOTYP (2026-10-15): geführter Stundenplaner, klickbar mit Beispieldaten, ohne KI und Speicherung. */
export default function StundenplanerVorschau() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [schritt, setSchritt] = React.useState(0);
  const [erreicht, setErreicht] = React.useState(0);
  const [wahl, setWahl] = React.useState(null);
  const [minuten, setMinuten] = React.useState(40);
  const [pause, setPause] = React.useState(false);
  const [ziel, setZiel] = React.useState({ haupt: ZIELE.haupt, teil: [] });
  const [gruppe, setGruppe] = React.useState({ fit: 3, stark: 3 });
  const [entwuerfe, setEntwuerfe] = React.useState(null);
  const [aktiv, setAktiv] = React.useState(0);
  const [routine, setRoutine] = React.useState('');

  const geheZu = (s) => { setSchritt(s); setErreicht((e) => Math.max(e, s)); };
  const entwerfen = () => {
    geheZu(4); setEntwuerfe(null); setAktiv(0);
    setTimeout(() => setEntwuerfe([alsEntwurf(FASSUNGEN.standard, { vorlage: 'standard' })]), 1200);
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
            <button key={s} disabled={i > erreicht || (i >= 4 && !entwuerfe)} onClick={() => setSchritt(i)} className="flex-1 text-left disabled:cursor-default">
              <div className={`h-1 rounded-full ${i <= schritt ? 'bg-primary' : 'bg-muted'}`} />
              <p className={`mt-1 text-[11px] ${i === schritt ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{s}</p>
            </button>
          ))}
        </div>
        <section className="rounded-2xl border bg-card/50 p-6">
          {schritt === 0 && <ProtoStart wahl={wahl} setWahl={setWahl} minuten={minuten} setMinuten={setMinuten} pause={pause} setPause={setPause} onWeiter={() => geheZu(1)} />}
          {schritt === 1 && <ProtoInhaltsanalyse onWeiter={() => geheZu(2)} />}
          {schritt === 2 && <ProtoStundenziel ziel={ziel} setZiel={setZiel} onWeiter={() => geheZu(3)} />}
          {schritt === 3 && <ProtoLerngruppe gruppe={gruppe} setGruppe={setGruppe} onWeiter={entwerfen} />}
          {schritt === 4 && !entwuerfe && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Ich erstelle einen gut machbaren Standardentwurf …</p>}
          {schritt === 4 && entwuerfe && <ProtoEntwurf entwuerfe={entwuerfe} setEntwuerfe={setEntwuerfe} aktiv={aktiv} setAktiv={setAktiv} routine={routine} setRoutine={setRoutine} pause={pause && minuten > 45} onWeiter={() => geheZu(5)} />}
          {schritt === 5 && <ProtoVorbereitung entwurf={entwuerfe[aktiv]} onZurueck={() => setSchritt(4)} onWeiter={() => geheZu(6)} />}
          {schritt === 6 && <ProtoUmsetzung phasen={entwuerfe[aktiv].phasen} />}
        </section>
      </div>
    </div>
  );
}