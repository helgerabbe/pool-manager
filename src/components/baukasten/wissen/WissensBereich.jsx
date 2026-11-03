import React from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { REITER } from './WissensLeiste';
import FachinhaltPanel from './FachinhaltPanel';
import MaterialienPanel from './MaterialienPanel';
import LerngruppePanel from './LerngruppePanel';
import TagebuchPanel from './TagebuchPanel';
import FundamentAnsicht from './FundamentAnsicht';

/** Hauptbereich für einen Reiter der Menüleiste. */
export default function WissensBereich({ bereich, wissen, fundament, onFundament, onZurueck }) {
  const r = REITER.find((x) => x.k === bereich);
  const { data, isLoading, refetch } = wissen;
  const ohneEinheit = bereich !== 'fundament' && !data && !isLoading;
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 space-y-5 duration-300">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">{r?.l}{bereich === 'fach' && ' der Einheit'}</h2>
        <button onClick={onZurueck} className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm hover:bg-muted"><ArrowLeft className="h-4 w-4" /> Zurück zum Stundenbau</button>
      </div>
      {bereich === 'fundament' && <FundamentAnsicht fundament={fundament} planung={data?.planung} onBearbeiten={onFundament} />}
      {ohneEinheit && <p className="text-sm text-muted-foreground">Diese Stunde gehört zu keiner Unterrichtseinheit.</p>}
      {bereich !== 'fundament' && isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
      {data && bereich === 'fach' && <FachinhaltPanel einheit={data.einheit} planung={data.planung} quellen={data.quellen} onNeu={refetch} />}
      {data && bereich === 'mat' && <MaterialienPanel planung={data.planung} fachregister={data.fachregister} />}
      {data && bereich === 'lg' && <LerngruppePanel einheit={data.einheit} lerngruppe={data.lerngruppe} />}
      {data && bereich === 'bisher' && <TagebuchPanel einheit={data.einheit} planung={data.planung} tagebuch={data.tagebuch} onNeu={refetch} />}
    </div>
  );
}